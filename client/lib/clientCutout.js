// Client-side HTML5 Canvas Studio Background Removal
export async function removeStudioBackgroundClient(imageUrl) {
  if (!imageUrl) return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        // BFS flood fill from outer borders for studio white/off-white background
        const visited = new Uint8Array(width * height);
        const queue = new Int32Array(width * height);
        let head = 0;
        let tail = 0;

        function isBg(idx) {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const brightness = (r + g + b) / 3;
          const diff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
          return brightness >= 232 && diff <= 24;
        }

        // Push 4 borders
        for (let x = 0; x < width; x++) {
          if (!visited[x] && isBg(x * 4)) {
            visited[x] = 1;
            queue[tail++] = x;
          }
          const bot = (height - 1) * width + x;
          if (!visited[bot] && isBg(bot * 4)) {
            visited[bot] = 1;
            queue[tail++] = bot;
          }
        }
        for (let y = 0; y < height; y++) {
          const left = y * width;
          if (!visited[left] && isBg(left * 4)) {
            visited[left] = 1;
            queue[tail++] = left;
          }
          const right = y * width + (width - 1);
          if (!visited[right] && isBg(right * 4)) {
            visited[right] = 1;
            queue[tail++] = right;
          }
        }

        while (head < tail) {
          const p = queue[head++];
          const px = p % width;
          const py = Math.floor(p / width);

          const neighbors = [
            px > 0 ? p - 1 : -1,
            px < width - 1 ? p + 1 : -1,
            py > 0 ? p - width : -1,
            py < height - 1 ? p + width : -1,
          ];

          for (const n of neighbors) {
            if (n !== -1 && !visited[n] && isBg(n * 4)) {
              visited[n] = 1;
              queue[tail++] = n;
            }
          }
        }

        // Center integrity check: Protect white products from being hollowed out
        let centerTotal = 0;
        let centerTransparent = 0;
        const cX1 = Math.floor(width * 0.35);
        const cX2 = Math.floor(width * 0.65);
        const cY1 = Math.floor(height * 0.30);
        const cY2 = Math.floor(height * 0.70);

        for (let y = cY1; y <= cY2; y++) {
          for (let x = cX1; x <= cX2; x++) {
            centerTotal++;
            if (visited[y * width + x]) {
              centerTransparent++;
            }
          }
        }

        const hollowRatio = centerTransparent / centerTotal;
        if (hollowRatio > 0.35) {
          // White product body detected: Abort cutout to preserve full solid product!
          resolve(null);
          return;
        }

        // Apply transparency
        for (let p = 0; p < width * height; p++) {
          if (visited[p]) {
            data[p * 4 + 3] = 0;
          }
        }

        ctx.putImageData(imgData, 0, 0);

        // Find bounding box to trim empty padding
        let minX = width, maxX = 0, minY = height, maxY = 0;
        let hasVisible = false;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (data[(y * width + x) * 4 + 3] > 20) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
              hasVisible = true;
            }
          }
        }

        if (!hasVisible || maxX <= minX || maxY <= minY) {
          resolve(canvas.toDataURL("image/png"));
          return;
        }

        const cropW = maxX - minX + 1;
        const cropH = maxY - minY + 1;
        const cropCanvas = document.createElement("canvas");
        cropCanvas.width = cropW;
        cropCanvas.height = cropH;
        const cropCtx = cropCanvas.getContext("2d");
        cropCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

        resolve({
          dataUrl: cropCanvas.toDataURL("image/png"),
          width: cropW,
          height: cropH,
        });
      } catch (err) {
        console.warn("Client-side background removal failed:", err);
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}
