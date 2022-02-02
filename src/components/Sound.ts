import { Engine } from 'noa-engine';
import { Howl } from 'howler';

type SoundOptions = {
    basePath?: string;
    soundOn?: boolean;
    musicOn?: boolean;
};

const names = [
    'grass1',
    'grass2',
    'grass3',
    'grass4',
    'gravel1',
    'gravel2',
    'gravel3',
    'gravel4',
    'stone1',
    'stone2',
    'stone3',
    'stone4',
    'wood1',
    'wood2',
    'wood3',
    'wood4',
    'calm1',
    'calm2',
    'calm3'
];

const sounds: {
    [name: string]: {
        file: string;
        volume: number;
        pitch: number;
    };
} = {
    grass: {
        file: 'grass',
        volume: 0.6,
        pitch: 1
    },
    cloth: {
        file: 'grass',
        volume: 0.7,
        pitch: 1.2
    },
    gravel: {
        file: 'gravel',
        volume: 1,
        pitch: 1
    },
    stone: {
        file: 'stone',
        volume: 1,
        pitch: 1
    },
    metal: {
        file: 'stone',
        volume: 1,
        pitch: 2
    },
    wood: {
        file: 'wood',
        volume: 1,
        pitch: 1
    }
};

const blockSoundMap = [
    null,
    {
        id: 'grass',
        volume: 0.9,
        pitch: 1
    },
    {
        id: 'stone',
        volume: 1,
        pitch: 1
    },
    {
        id: 'grass',
        volume: 0.8,
        pitch: 1
    },
    {
        id: 'wood',
        volume: 1,
        pitch: 1
    },
    null,
    null,
    null,
    null,
    {
        id: 'stone',
        volume: 1,
        pitch: 1
    },
    null,
    {
        id: 'gravel',
        volume: 0.8,
        pitch: 1
    },
    {
        id: 'gravel',
        volume: 0.8,
        pitch: 1
    },
    {
        id: 'wood',
        volume: 1,
        pitch: 1
    },
    {
        id: 'grass',
        volume: 1,
        pitch: 0.4
    },
    null,
    null,
    null,
    {
        id: 'stone',
        volume: 1,
        pitch: 1
    },
    {
        id: 'stone',
        volume: 1,
        pitch: 1
    },
    {
        id: 'stone',
        volume: 1,
        pitch: 1
    },
    {
        id: 'metal',
        volume: 0.7,
        pitch: 1
    },
    {
        id: 'cloth',
        volume: 1,
        pitch: 0.9
    },
    {
        id: 'metal',
        volume: 1,
        pitch: 1
    },
    {
        id: 'cloth',
        volume: 1,
        pitch: 1
    },
    {
        id: 'cloth',
        volume: 1,
        pitch: 1
    },
    {
        id: 'cloth',
        volume: 1,
        pitch: 1
    },
    {
        id: 'cloth',
        volume: 1,
        pitch: 1
    },
    {
        id: 'cloth',
        volume: 1,
        pitch: 1
    },
    {
        id: 'cloth',
        volume: 1,
        pitch: 1
    },
    {
        id: 'cloth',
        volume: 1,
        pitch: 1
    },
    {
        id: 'cloth',
        volume: 1,
        pitch: 1
    },
    {
        id: 'cloth',
        volume: 1,
        pitch: 1
    },
    {
        id: 'cloth',
        volume: 1,
        pitch: 1
    },
    {
        id: 'cloth',
        volume: 1,
        pitch: 1
    },
    {
        id: 'cloth',
        volume: 1,
        pitch: 1
    },
    {
        id: 'cloth',
        volume: 1,
        pitch: 1
    },
    {
        id: 'cloth',
        volume: 1,
        pitch: 1
    },
    {
        id: 'cloth',
        volume: 1,
        pitch: 1
    },
    {
        id: 'cloth',
        volume: 1,
        pitch: 1
    }
];

class SoundComponent {
    private howls: { [name: string]: Howl } = {};
    private options: SoundOptions = {};

    constructor(engine: Engine, options?: SoundOptions) {
        this.options = { basePath: 'assets/sounds', soundOn: true, musicOn: false, ...options };

        const { basePath } = this.options;
        names.forEach((it) => {
            this.howls[it] = new Howl({
                src: [`${basePath}/${it}.mp3`, `${basePath}/${it}.ogg`]
            });
        });
    }

    play(id: string, volume: number, pitch: number) {
        const { soundOn } = this.options;
        if (soundOn) {
            const index = Math.floor(4 * Math.random()) + 1;
            const howl = this.howls[`${sounds[id].file}${index}`];
            const howlId = howl.play();
            howl.volume((volume / (0.4 * Math.random() + 1)) * 0.5, howlId);
            howl.rate(pitch / (0.2 * Math.random() + 0.9), howlId);
        }
    }

    blockPlay(id: number) {
        const blockSound = blockSoundMap[id];
        if (blockSound) {
            this.play(blockSound.id, blockSound.volume, blockSound.pitch);
        }
    }

    private musicStarted = false;
    private music?: Howl;
    startMusic() {
        let timeout: number;
        if (this.musicStarted) {
            timeout = 300000 + 900000 * Math.random();
        } else {
            timeout = 60000 * Math.random();
            this.musicStarted = true;
        }

        setTimeout(() => {
            const index = Math.floor(3 * Math.random()) + 1;
            this.music = this.howls[`calm${index}`];
            const howlId = this.music.play();
            this.music.volume(this.options.musicOn ? 1 : 0, howlId);
            this.music.on('end', () => {
                this.startMusic();
            });
        }, timeout);
    }

    setMusicVolume(volume: number) {
        if (this.music) {
            this.music.volume(volume);
        }
    }
}

export default function (engine: Engine, options?: SoundOptions) {
    const component = new SoundComponent(engine, options);
    component.startMusic();
    return component;
}
