"""Export a material-preserving, editable web scene from the V4 Blender project."""
import json
import os
from collections import Counter, defaultdict
from pathlib import Path

import bpy

source = bpy.context.scene
source.frame_set(1)
depsgraph = bpy.context.evaluated_depsgraph_get()
active = [o for o in source.objects if not o.hide_render and o.type in {'MESH', 'CURVE'}]
target = Path(os.environ['INS_WORLD_OUTPUT'])
target.mkdir(parents=True, exist_ok=True)
dest = bpy.data.collections.new('Phase 02 / detailed runtime')
source.collection.children.link(dest)
bpy.ops.object.select_all(action='DESELECT')

materials = {}
groups = {}
batches = defaultdict(list)
instances = defaultdict(list)
banks = {}
stats = defaultdict(int)
source_counts = Counter()
profiles = Counter()

def group(label):
    if label not in groups:
        anchor = bpy.data.objects.new(label, None)
        dest.objects.link(anchor)
        anchor['runtime_group'] = label
        groups[label] = anchor
    return groups[label]

def material(original):
    if original in materials:
        return materials[original]
    name = original.name if original else 'Neutral construction material'
    result = bpy.data.materials.new('Web / ' + name)
    result.use_nodes = True
    nodes = result.node_tree.nodes
    links = result.node_tree.links
    nodes.clear()
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    output = nodes.new('ShaderNodeOutputMaterial')
    links.new(bsdf.outputs['BSDF'],output.inputs['Surface'])
    if not original:
        materials[None] = result
        return result
    bsdf.inputs['Base Color'].default_value = original.diffuse_color
    if original.use_nodes:
        tree = original.node_tree
        pbr = next((n for n in tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        glow = next((n for n in tree.nodes if n.type == 'EMISSION'), None)
        if pbr:
            for key in ('Base Color', 'Roughness', 'Metallic', 'Emission', 'Emission Strength', 'Alpha'):
                bsdf.inputs[key].default_value = pbr.inputs[key].default_value
            inputs = pbr.inputs['Base Color']
            if inputs.is_linked:
                node = inputs.links[0].from_node
                if node.type == 'VALTORGB':
                    stops = list(node.color_ramp.elements)
                    bsdf.inputs['Base Color'].default_value = tuple((stops[0].color[i]+stops[-1].color[i])*.5 for i in range(4))
                elif node.type == 'TEX_IMAGE' and node.image:
                    texture = nodes.new('ShaderNodeTexImage')
                    texture.image = node.image
                    links.new(texture.outputs['Color'], bsdf.inputs['Base Color'])
        elif glow:
            color = tuple(glow.inputs[0].default_value)
            bsdf.inputs['Base Color'].default_value = color
            bsdf.inputs['Emission'].default_value = color
            bsdf.inputs['Emission Strength'].default_value = min(2.6, glow.inputs[1].default_value)
        if 'original AI path artwork' in name:
            tex = next(n for n in tree.nodes if n.type == 'TEX_IMAGE' and n.image)
            tex_out = nodes.new('ShaderNodeTexImage')
            tex_out.image = tex.image
            links.new(tex_out.outputs['Alpha'], bsdf.inputs['Alpha'])
            bsdf.inputs['Base Color'].default_value=(1,.83,.66,1)
            bsdf.inputs['Emission'].default_value=(1,.86,.72,1)
            bsdf.inputs['Emission Strength'].default_value=1.2
            result.blend_method='CLIP'
    materials[original] = result
    return result

def web_mesh(ob, raw=False):
    if raw:
        m = ob.data.copy()
    else:
        m = bpy.data.meshes.new_from_object(ob.evaluated_get(depsgraph),
            preserve_all_data_layers=True, depsgraph=depsgraph)
    if not m or not m.polygons:
        return None
    originals = list(m.materials)
    if len(originals):
        for i, original in enumerate(originals):
            m.materials[i] = material(original)
    else:
        m.materials.append(material(None))
    m.calc_loop_triangles()
    return m

def simplify_chain(points, tolerance=.00045):
    if len(points)<3:
        return points
    ax,ay=points[0];bx,by=points[-1]
    dx,dy=bx-ax,by-ay
    length=dx*dx+dy*dy
    def distance(point):
        x,y=point[0]-ax,point[1]-ay
        t=max(0,min(1,(x*dx+y*dy)/length)) if length else 0
        return (x-t*dx)**2+(y-t*dy)**2
    farthest=max(range(1,len(points)-1),key=lambda i:distance(points[i]))
    if distance(points[farthest])<=tolerance*tolerance:
        return [points[0],points[-1]]
    return simplify_chain(points[:farthest+1],tolerance)[:-1]+simplify_chain(points[farthest:],tolerance)

def folded_profile(ob):
    # The dense S340 sections contain exactly two levels. Recover the actual
    # cap boundary rather than approximating their corrugations with boxes.
    if len(ob.data.polygons)<3000:
        return None
    points=[vertex.co[:] for vertex in ob.data.vertices]
    lower=min(p[2] for p in points)
    upper=max(p[2] for p in points)
    if upper-lower<.01 or any(min(abs(p[2]-lower),abs(p[2]-upper))>.00012 for p in points):
        return None
    xy=[(round(p[0],5),round(p[1],5)) for p in points]
    top=[abs(p[2]-upper)<.00012 for p in points]
    triangles={tuple(sorted(xy[i] for i in face.vertices)) for face in ob.data.polygons
               if len(face.vertices)==3 and all(top[i] for i in face.vertices)}
    edges=Counter(tuple(sorted((tri[i],tri[(i+1)%3]))) for tri in triangles
                  if len(set(tri))==3 for i in range(3))
    neighbors=defaultdict(set)
    for (a,b),count in edges.items():
        if count==1:
            neighbors[a].add(b)
            neighbors[b].add(a)
    if not neighbors or any(len(items)!=2 for items in neighbors.values()):
        return None
    vertices=[];faces=[]
    while neighbors:
        start=min(neighbors)
        route=[start]
        last=start
        point=min(neighbors[start])
        while point!=start:
            route.append(point)
            nxt=next(item for item in neighbors[point] if item!=last)
            last,point=point,nxt
        for point in route:
            del neighbors[point]
        half=len(route)//2
        route=simplify_chain(route[:half+1])[:-1]+simplify_chain(route[half:]+[start])[:-1]
        if len(route)<3:
            continue
        area=sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(route,route[1:]+route[:1]))
        if area<0:
            route.reverse()
        count=len(route);offset=len(vertices)
        vertices.extend((x,y,z) for z in (lower,upper) for x,y in route)
        faces.append(tuple(offset+i for i in reversed(range(count))))
        faces.append(tuple(offset+count+i for i in range(count)))
        for i in range(count):
            j=(i+1)%count
            faces.append((offset+i,offset+j,offset+count+j,offset+count+i))
    if not faces:
        return None
    m=bpy.data.meshes.new(ob.name+' / source profile')
    m.from_pydata(vertices,[],faces)
    m.update()
    m.materials.append(material(ob.data.materials[0] if ob.data.materials else None))
    profiles['rebuilt']+=1
    return m

def trim_entrance_overlay(ob):
    # One CAD podium skin spans the doorway at +0.80 m, above its documented
    # +0.60 m sill. Cut the local approach only. Keep the rest of the SKP shell.
    limits=((0,-4.22,1),(0,4.22,-1),(1,.06,1),(1,3.46,-1),
            (2,-.01,1),(2,.87,-1))
    def split(polygon, axis, cut, sign):
        inside=[];outside=[]
        for a,b in zip(polygon,polygon[1:]+polygon[:1]):
            da=sign*(a[axis]-cut);db=sign*(b[axis]-cut)
            (inside if da>=0 else outside).append(a)
            if (da<0<db) or (db<0<da):
                t=da/(da-db)
                v=tuple(a[i]+t*(b[i]-a[i]) for i in range(3))
                inside.append(v);outside.append(v)
            elif da==0 and db<0:
                outside.append(a)
            elif da<0 and db==0:
                outside.append(b)
        return inside,outside

    m=ob.data
    original=[vertex.co[:] for vertex in m.vertices]
    polygons=[]
    for face in m.polygons:
        queue=[original[i] for i in face.vertices]
        for axis,cut,sign in limits:
            if len(queue)<3:
                break
            queue,outside=split(queue,axis,cut,sign)
            if len(outside)>=3:
                polygons.append(outside)
    vertices=[];faces=[];indices={}
    for polygon in polygons:
        ids=[]
        for v in polygon:
            point=tuple(round(c,6) for c in v)
            if point not in indices:
                indices[point]=len(vertices)
                vertices.append(point)
            i=indices[point]
            if i not in ids:ids.append(i)
        if len(ids)>=3:faces.append(ids)
    skin=bpy.data.meshes.new('SKP podium skin / local doorway clearance')
    skin.from_pydata(vertices,[],faces);skin.update()
    skin.materials.append(material(m.materials[0]))
    return skin

def entrance_stairs():
    # Treads, outer cheeks and foundation share vertices and have no internal faces.
    xs=(-4.22,-4.055,4.055,4.22)
    ys=(.81,1.13,1.55,1.97,2.47,3.145,3.46)
    zs=(-.035,.145,.289,.444,.599,.8)
    heights=((1,2,3,4,5,5),(0,2,3,4,4,0),(1,2,3,4,5,5))
    cells={(x,y,z) for x,row in enumerate(heights) for y,top in enumerate(row) for z in range(top)}
    vertices=[];faces=[];ids={}
    sides=(
        ((-1,0,0),((0,0,0),(0,0,1),(0,1,1),(0,1,0))),
        ((1,0,0),((1,0,0),(1,1,0),(1,1,1),(1,0,1))),
        ((0,-1,0),((0,0,0),(1,0,0),(1,0,1),(0,0,1))),
        ((0,1,0),((0,1,0),(0,1,1),(1,1,1),(1,1,0))),
        ((0,0,-1),((0,0,0),(0,1,0),(1,1,0),(1,0,0))),
        ((0,0,1),((0,0,1),(1,0,1),(1,1,1),(0,1,1))),
    )
    for x,y,z in sorted(cells):
        for (dx,dy,dz),points in sides:
            if (x+dx,y+dy,z+dz) in cells:
                continue
            face=[]
            for px,py,pz in points:
                key=(x+px,y+py,z+pz)
                if key not in ids:
                    ids[key]=len(vertices)
                    vertices.append((xs[key[0]],ys[key[1]],zs[key[2]]))
                face.append(ids[key])
            faces.append(face)
    edges=Counter(tuple(sorted((a,b))) for face in faces for a,b in zip(face,face[1:]+face[:1]))
    assert edges and all(count==2 for count in edges.values()), 'Entrance solid has an open or non-manifold edge'
    mesh=bpy.data.meshes.new('Closed stone stair and landing')
    mesh.from_pydata(vertices,[],faces);mesh.update()
    stone=bpy.data.materials.get('V4 / shaded chiseled curbstone')
    mesh.materials.append(material(stone))
    ob=bpy.data.objects.new(mesh.name,mesh)
    dest.objects.link(ob)
    ob.parent=group('Entrance stairs')
    ob['sill_height_m']=.60
    ob['manifold_edge_count']=len(edges)
    ob['source_basis']='SKP Group #17/Group #22/Group #0; V4 entrance axis'
    return ob

def copy_object(ob, label, raw=False, independent=False):
    key=ob.get('sketchup_group','')
    trims=key.endswith('/Group #11/Group #0') and key.startswith('自然面红色陶板') and ob.name.endswith(' | *71')
    m=trim_entrance_overlay(ob) if trims else folded_profile(ob) if label=='Folded cladding' else None
    if trims:
        profiles['entry_overlay_trimmed']+=1
    if not m:
        if label=='Folded cladding':
            profiles['native'] += 1
        m = web_mesh(ob, raw)
    if not m:
        return
    mesh = bpy.data.objects.new(ob.name, m)
    dest.objects.link(mesh)
    mesh.matrix_world = ob.matrix_world.copy()
    mesh.parent = group(label)
    m.calc_loop_triangles()
    stats[label] += len(m.loop_triangles)
    if ob.get('sketchup_group'):
        source_counts[ob['sketchup_group'].split('/')[0].strip()] += 1
    if independent:
        if ob.name.startswith('Media façade'):
            mesh['screen_surface'] = True
        return
    batches[label].append(mesh)

def classify(o):
    n = o.name
    collections = {c.name.split(' | ')[0] for c in o.users_collection}
    full = {c.name for c in o.users_collection}
    key = o.get('sketchup_group', '')
    if n.startswith(('Seamless dark surrounds','Mist /','Atmosphere • dark peripheral ridge')):
        return None
    if n.startswith(('Round axial plaza','Fountain site /')):
        return 'Park'
    if n.startswith('Media façade • programmable surface'):
        return 'Screens'
    if n.startswith(('Entry / honed stone treads','Curtain wall / principal boxed mullion','Glazing / horizontal pressure cap')):
        return None
    if n.startswith(('Media wall /', 'Entry /','Entry portal','Flush logo','Entry seam','Official main entrance','Entrance brass threshold')):
        return 'Main entrance'
    if '11' in collections:
        if n.startswith(('Roof','Parapet')):
            return 'Roof'
        return 'Back facade' if n.startswith('Side/rear') else 'Facade'
    if key:
        root=key.split('/')[0]
        if root=='Group #45':
            return 'Folded cladding'
        if root in {'Group #7','Group #39','Group #50'}:
            return 'Entrance structure'
        if root in {'Group #46','Group #47'} or root.startswith('组件#157 #'):
            return 'Media framing'
        if any(c.startswith('Media facade •') for c in full):
            return None
        if key.split('/')[0] in {f'Group #{i}' for i in range(24,31)}:
            return 'Roof'
        if any(c.startswith('External envelope') for c in full):
            return 'Facade'
        if any(c.startswith('Podium and central') for c in full):
            if 'Carpet' in n or '/Group #21/' in key:
                return None
            return 'Building base'
        if key.split('/')[0] in {'Group #3','Group #4','Group #38','Group #40'}:
            return 'Roof'
        if any(c.startswith('Source glazing') for c in full) and key.startswith(('Group #48/','Group #49/')):
            return 'Facade'
        return None
    if n.startswith(('Soft peripheral ridge',)):
        return 'Ground'
    if '16' in collections:
        return 'Vegetation'
    if '17' in collections:
        return 'Fountain'
    if collections.intersection({'05','14'}):
        return 'Amusement'
    if '06' in collections or n.startswith(('Lotus basin','Lotus pond /','Lotus garden')):
        return 'Lotus Pond'
    if (collections.intersection({'03','07','12','18'}) or n.startswith(('Axis inset','Continuous park terrain'))):
        if n.startswith(('Paving cross joint','Paving longitudinal joint')):
            return None
        return 'Park'
    return None

for o in active:
    label = classify(o)
    if label is None:
        continue
    if o.name.startswith(('V4 crown /','V4 leaf relief /')):
        relief = o.name.startswith('V4 leaf relief /')
        kind = 'relief' if relief else 'crown'
        key = o.data.name
        if key not in banks:
            model = bpy.data.objects.new('Tree module / '+key, web_mesh(o, raw=True))
            dest.objects.link(model)
            model['foliage_module'] = kind
            model.parent = group('Vegetation')
            if not relief:
                bpy.context.view_layer.objects.active = model
                modifier = model.modifiers.new('Preserve the authored crown silhouette', 'DECIMATE')
                modifier.ratio = .40
                bpy.ops.object.modifier_apply(modifier=modifier.name)
            model.data.calc_loop_triangles()
            banks[key] = model
        matrix = o.matrix_world
        instances[key].append([round(matrix[i][j],5) for j in range(4) for i in range(4)])
        continue
    copy_object(o,label,raw=bool(o.get('sketchup_group')),independent=label=='Screens' or o.name.startswith('Official main entrance'))

entry_stair=entrance_stairs()
entry_stair.data.calc_loop_triangles()
stats['Entrance stairs']+=len(entry_stair.data.loop_triangles)
building = group('Building')
for label in ('Building base','Facade','Back facade','Roof','Main entrance','Screens','Folded cladding','Entrance structure','Entrance stairs','Media framing'):
    if label in groups:
        groups[label].parent=building
for key, bank in banks.items():
    bank['foliage_instances'] = json.dumps(instances[key],separators=(',',':'))

# Join after evaluation to preserve authored bevels, normals, UVs and material indices.
for label, objects in batches.items():
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    first = objects[0]
    bpy.context.view_layer.objects.active = first
    if len(objects) > 1:
        bpy.ops.object.join()
    first.name = label + ' / surfaces'

bpy.ops.object.select_all(action='DESELECT')
for obj in dest.objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active=building
bpy.ops.export_scene.gltf(filepath=str(target/'world-detail.glb'),export_format='GLB',
    use_selection=True,export_extras=True,export_cameras=False,export_lights=False,export_animations=False)
report = dict(static_triangles=dict(stats), materials=len(materials), entrance_source_objects=dict(source_counts), folded_profiles=dict(profiles), foliage={
    key: dict(triangles=len(bank.data.loop_triangles), copies=len(instances[key]))
    for key,bank in banks.items()
}, asset_bytes=(target/'world-detail.glb').stat().st_size)
(target/'detail_stats.json').write_text(json.dumps(report, indent=2))
print('DREAMSCAPE EXPORT', report['asset_bytes'], sum(stats.values()), 'static triangles', flush=True)
