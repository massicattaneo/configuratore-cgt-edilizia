SYSTEM
======

This class contains the system core functionalities:

1. ##### DEVICEINFO
    A Class to manage and retrieve the device info
    ```
    system.deviceInfo()
    {
        deviceType: 'desktop',
        os: 'windows',
        osVersion: '7',
        browserName: 'ie',
        browserVersion: '11',
        assetsQuality: 1, //modify with system.setAssetsQuality()
        maximumAssetsQuality: 1, //modify with system.setMaximumAssetsQuality()
        bgMusicQuality: 1, //modify with system.setBgMusicQuality()
        resolution: 1, //modify with system.setResolution()
        width: 1000, //window width,
        height: 600, //window height,
        designMode: 'landscape', //modify with system.setDesignMode()
        forceCanvas: false
        ...
    }
    ```
2. ##### FILELOADER
    A Class to manage the file loading
    ```
    import backgroundMusicManifest from './assets/sounds/background-musics.manifest.json';
    import soundsManifest from './assets/sounds/sounds.manifest.json';
    import fontsManifest from './assets/fonts/fonts.manifest.json';
    import imagesManifest from './assets/images/images.manifest.json';
    import spinesManifest from './assets/spine/spines.manifest.json';
    import FontLoader from 'fonts-loader';
    import PixiLoader from 'pixi-loader';
    import { SoundManager, SoundCapabilityFactory } from 'sound-manager';
    
    system
        .addFileManifest(imagesManifest)
        .addFileManifest(fontsManifest)
        .addFileManifest(spinesManifest)
        .addFileManifest(backgroundMusicManifest)
        .addFileManifest(soundsManifest)
        .addFileLoader(['font'], FontLoader(system.info()))
        .addFileLoader(['sound'], soundManager.soundLoader(system.info()))
        .addFileLoader(['bg-music'], soundManager.lazyLoader(system.info()))
        .addFileLoader(['pixi-image', 'pixi-spine'], PixiLoader(system.info()))
        
    const estimated = system.stageLoadAssetsQualityEstimation(['splash', 'preloader'], [
            { assetsQuality: 1, time: 10 },
            { assetsQuality: 0.5, time: 10 },
            { assetsQuality: 0.25, time: 10 }
        ]);
    
    system.loadStageFilesFromCdn('preloader')
        .on('progress', percentage => console.log(percentage))
        .start()
        .then((resources) => {/* finished */});
    ```
3. ##### NAVIGATOR
    A Class to manage the browser history (still not implemented)
    ```
    system.onNavigate().subscribe(function (event, params) {});
    system.navigateTo('somewhere', {});
    
    //N.B.
    //On navigating to  
    //'website-deposit', 'website-login', 'website-home', 'website-reload', 'website-join':
    //The system waits for all the strems to be resolved and then redirects to the link:
    //Ex.:
    system
        .onNavigate()
        .filter(e => e === 'website-deposit')
        .subscribe(function (event, params, utils) {
            //trace to webbtrekk and then automatics go to deposit
            const name = 'system-dialog-make-a-deposit';
            const behaviour = 'website-deposit';
            return utils.trace('item-clicked', {name, behaviour}); 
        });
        system.navigateTo('website-deposit', {});
    
    ```
4. ##### STATSMANAGER
    A Class to manage webtrekk tracking
    ```
    //wrapped into system navigation
    system.onNavigate()
        .subscribe(function (event, params, utils) {
            utils.trace('item-clicked', {});
        });
    system.navigateTo('somewhere', {});
    
    //wrapped into system errors
    system.catch()
        .subscribe(function (error, params, utils) {
            utils.trace('system-error', params)
        });
    system.throw('an-error', {});        
    
    //direct call through system
    system.trace('action-summary', {
        variables: {
            v2: numOfLinesPlayed,
            v3: isAutoSpin,
            v4: isFreeSpin,
            v36: isSpaceBar,
            v5: numOfLinesWon,
            v6: numOfLinesWon > 0 ? 'WON' : 'LOST',
            v14: secondsToContactServer
        }
    });
    ```
5. ##### STORAGE
    A Class to manage the cookies on the browser
    ```
    system.initStorage({music: true}) //to set default init values if not present on the storage
    system.setStorage({music: false}) //to set values
    system.getStorage('music') //to get value
    system.removeStorage('music') //to remove a key
    ```
6. ##### ERROR
    A Class to manage the errors
    |ERROR|ENUM VALUE|DESCRIPTION|
    |---|---|---|
    | UNAUTHORIZED | 0 | normally coming from the server |
    | GENERAL_ERROR | 1 | whatever else |
    | INSUFFICIENT_FUNDS |2 | when the user has not enough funds to play |
    ```
    system.catch().subscribe(function (error, params) {});
    system.throw('an-error', {});
    ```
7. ##### INFO
    A method for retrieving all the system info coming from the *CONFIGURATION* and the *URL*
    ```
        system.info();
        {
            mode: 'fun'
            lang: 'en'
            forReal: false,
            statsOn: false;
            token: '';
            gameId: 'FastAndSexy';
            gameType: 'Slot';
            cdnHosts: ['', '', ''];
            serverUr: '/services/casino/cgs-gs';
            ...
        }
    ```
8. ##### STATUS
    A method to set the status of the system:
    
    ```
    system.status(system.STATUS.GAME_SHOW_PRELOAD);
    ```

|ERROR|ENUM VALUE|DESCRIPTION|
|---|---|---|
|READY |0 |when the system is created and setted up |
|CONTENT_LOADED |1|managed inside when it fires window.onload |
|SETUP| 2|when system is set up|
|GAME_SHOW_PRELOAD| 3| when the preloader is shown on the screen|
|LOGGED_TO_SERVER| 4|when you are logged in to the server|
|GAME_READY_TO_PLAY| 5 |when the user can perform any kind of action|


9. ##### AUDIO PLAYER
    A method to set and retrive the audio player
    
    ```
    import { SoundManager, SoundCapabilityFactory } from 'sound-manager';
    const soundCapability = SoundCapabilityFactory().get(system);    
    const soundManager = SoundManager(soundCapability);
    system.audioPlayer(soundManager);
    system.audioPlayer().play('a-sound');
    ```

10. ###### THREAD
    An object (safe thread) where you can execute functions (statements)
    
    ```
    document.addEventListener('game', function (data) {
        const statements = {myInjectedStatement: () => {}}; /statements are instructions/states
        const gos = { spinButton: {} }; //gos stands for GAME OBJECTS
        const thread = data.detail.start({ statements, gos });
        thread.execute(function myDirectStatement({ system, gos, thread, wait, Queue }) {
            console.log(this.prevStatement); // ''
            console.log(this.actualStatement); // 'myDirectStatement'
            thread.execute('myInjectedStatement');
            console.log(this.prevStatement); // 'myDirectStatement'
            console.log(this.actualStatement); // 'myInjectedStatement'
            this.queue = Queue([
                () => wait.promise((res) => {console.log('1'); res()}),
                () => wait.time(2000),
                () => console.log('2')
            ])
        });
        thread.execute(function playQueue() {
            console.log(this.prevStatement); // 'myInjectedStatement'
            console.log(this.actualStatement); // 'playQueue'
            this.queue.play().then(() => {
                console.log(this.queue);
            });
            //'1'
            // ... 1 second
            //'2'
        })
    });
    
    system.status(system.STATUS.READY);
        system.loadScripts(system.cacheBuster('theme/game.js', { accesses: 5 }), () => {
            system.launchApp('game');
        });
    ```
