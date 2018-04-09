PANDORA GENERIC LOADER
====================

The class work as a script/bundle loader. 
1. It injects the script in the 'head' of the document.
2. Notify for the progress.

**This loader should be used with the "gml-system" module**

Example:

```
import System from 'gml-system'; 
import ScriptLoader from 'gml-scriptsloader';
const system = System({});
system
        .addFileManifest([
            {size:19384, stage:"scripts", type:"script", url:"myscript.js"}
        ])
        .addFileLoader(['script'], ScriptLoader(system.info()))

const resources = await system.loadStageFiles('scripts')
    .on('progress', function (percentage) {console'log(percentage)})
    .start();


```
