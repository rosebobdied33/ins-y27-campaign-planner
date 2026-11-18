import {loginEditions} from './login-editions';
export const crystalThemes=loginEditions[2027].map(edition=>({
 themeId:edition.code,
 themeName:edition.code==='S07'?'奇妙博物馆':edition.name,
 skyGradient:[edition.deep,edition.wash,edition.glow],
 ambientColor:edition.glow,fogColor:edition.wash,groundColor:edition.deep,
 crystalEmission:edition.glow,particleColor:edition.glow,transitionDuration:800,
}));
