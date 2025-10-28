import React from 'react';

interface CameraUIProps {
    videoRef: React.RefObject<HTMLVideoElement>;
    onCapture: () => void;
    uiState: 'camera' | 'processing' | 'done';
    statusMessage: string;
    isCameraReady: boolean;
}

const Spinner: React.FC = () => (
    <div className="w-16 h-16 border-4 border-white border-t-purple-500 border-solid rounded-full animate-spin"></div>
);

const Checkmark: React.FC = () => (
    <svg className="w-20 h-20 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);


const CameraUI: React.FC<CameraUIProps> = ({ videoRef, onCapture, uiState, statusMessage, isCameraReady }) => {
    return (
        <div className="relative w-full h-full bg-black flex items-center justify-center">
            {/* Live Camera Feed */}
            <video 
                ref={videoRef} 
                className="absolute top-0 left-0 w-full h-full object-cover" 
                muted 
                playsInline
                aria-hidden="true"
            ></video>

            {/* UI Overlay */}
            <div className="absolute top-0 left-0 w-full h-full flex flex-col justify-between p-6 z-10 pointer-events-none">
                {/* Header */}
                <div className="text-center text-white bg-black bg-opacity-40 p-3 rounded-xl shadow-lg max-w-sm mx-auto">
                    <h1 className="text-xl font-bold">AI Portrait Studio</h1>
                </div>

                {/* Shutter Button Area */}
                <div className="flex justify-center pointer-events-auto">
                    {uiState === 'camera' && (
                        <button 
                            onClick={onCapture}
                            aria-label="Capture photo"
                            disabled={!isCameraReady}
                            className={`w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-2xl transition-transform transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 focus:ring-purple-500 focus:ring-opacity-50 ${!isCameraReady ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <div className="w-16 h-16 rounded-full bg-white border-4 border-black"></div>
                        </button>
                    )}
                </div>
            </div>

            {/* Status Message for Camera View */}
            {uiState === 'camera' && (
                 <div className="absolute bottom-28 w-full text-center p-2 text-white text-sm bg-black bg-opacity-30">
                    <p>{statusMessage}</p>
                </div>
            )}


            {/* Processing / Done Overlay */}
            {(uiState === 'processing' || uiState === 'done') && (
                <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-20 text-white text-center p-4 transition-opacity duration-300">
                    {uiState === 'processing' && <Spinner />}
                    {uiState === 'done' && <Checkmark />}
                    <p className="mt-6 text-lg font-semibold">{statusMessage}</p>
                    {uiState === 'done' && <p className="text-sm text-gray-300 mt-1">Image saved to gallery.</p>}
                </div>
            )}
        </div>
    );
};

export default CameraUI;