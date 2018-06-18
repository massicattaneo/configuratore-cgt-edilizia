import imageManifest from '../../assets/images/image.manifest.json';
// import fontManifest from '../../assets/fonts/font.manifest.json';
import appsManifest from '../../apps/apps.manifest.json';
import ImageLoader from 'gml-image-loader';
// import FontLoader from 'gml-font-loader';
import ScriptLoader from 'gml-scripts-loader'

export default async function ({ system }) {

    this.appsManifest = appsManifest;

    system
        .setMaximumDeviceAssetsQuality(1, () => true)
        .addFileManifest(imageManifest)
        // .addFileManifest(fontManifest)
        .addFileManifest(appsManifest)
        .addFileLoader(['image'], ImageLoader())
        // .addFileLoader(['font'], FontLoader())
        .addFileLoader(['application', 'script'], ScriptLoader())

}
