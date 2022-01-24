class ColorMap {
    static load(name: string): Promise<(x: number, y: number) => string> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = `/assets/textures/colormap/${name}.png`;
            img.onload = () => {
                const mw = img.width;
                const mh = img.height;
                const canvas = document.createElement('canvas');
                canvas.width = mw;
                canvas.height = mh;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(name);
                }

                ctx.drawImage(img, 0, 0);
                const map = ctx.getImageData(0, 0, mw, mh);
                resolve((x: number, y: number) => {
                    const cy = Math.floor((y * map.height) / 256);
                    const cx = Math.floor((x * map.width) / 256);
                    const offset = (cy * map.width + cx) * 4;
                    return `rgba(${map.data[offset]}, ${map.data[offset + 1]}, ${map.data[offset + 2]}, 1)`;
                });
            };
            img.onerror = () => reject(name);
        });
    }
}

export { ColorMap };
