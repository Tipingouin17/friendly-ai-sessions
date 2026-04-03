/**
 * Avatar Upload Modal
 *
 * Profile component for the AIfacilitator application.
 */
import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, X, Check, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AvatarUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    currentAvatarUrl?: string;
    userName: string;
}

export const AvatarUploadModal: React.FC<AvatarUploadModalProps> = ({
    isOpen,
    onClose,
    userId,
    currentAvatarUrl,
    userName
}) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast({
                title: "Invalid File Type",
                description: "Please select an image file (JPG, PNG, GIF, etc.)",
                variant: "destructive",
            });
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast({
                title: "File Too Large",
                description: "Please select an image smaller than 5MB",
                variant: "destructive",
            });
            return;
        }

        setSelectedFile(file);

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
                setIsCameraActive(true);
            }
        } catch (error) {
            console.error('Error accessing camera:', error);
            toast({
                title: "Camera Access Denied",
                description: "Please allow camera access to take a photo.",
                variant: "destructive",
            });
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraActive(false);
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to blob
        canvas.toBlob((blob) => {
            if (!blob) return;

            const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
            setSelectedFile(file);
            setPreviewUrl(canvas.toDataURL('image/jpeg'));
            stopCamera();
        }, 'image/jpeg', 0.9);
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setIsUploading(true);

        try {
            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `${userId}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            // Upload to Supabase storage
            const { error: uploadError } = await supabase.storage
                .from('user-avatars')
                .upload(filePath, selectedFile, {
                    upsert: true,
                    contentType: selectedFile.type
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('user-avatars')
                .getPublicUrl(filePath);

            // Store avatar URL in user metadata
            const { error: updateError } = await supabase.auth.updateUser({
                data: { avatar_url: publicUrl }
            });

            if (updateError) throw updateError;

            // Invalidate queries to refresh UI
            queryClient.invalidateQueries({ queryKey: ['userMetadata'] });

            toast({
                title: "Avatar Updated",
                description: "Your profile picture has been updated successfully!",
            });

            handleClose();
        } catch (error) {
            console.error('Error uploading avatar:', error);
            toast({
                title: "Upload Failed",
                description: "Failed to upload avatar. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemove = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleClose = () => {
        stopCamera();
        setSelectedFile(null);
        setPreviewUrl(null);
        onClose();
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(part => part[0]).join('').toUpperCase();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Update Profile Picture</DialogTitle>
                    <DialogDescription>
                        Upload an image or take a photo. Max file size: 5MB.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="upload" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="upload" onClick={stopCamera}>
                            <Upload size={16} className="mr-2" />
                            Upload
                        </TabsTrigger>
                        <TabsTrigger value="camera" onClick={startCamera}>
                            <Camera size={16} className="mr-2" />
                            Camera
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="upload" className="space-y-4">
                        <div className="flex flex-col items-center gap-6 py-4">
                            {/* Avatar Preview */}
                            <div className="relative">
                                <Avatar className="h-32 w-32 border-4 border-gray-100">
                                    <AvatarImage
                                        src={previewUrl || currentAvatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${userName}&backgroundColor=4f46e5`}
                                        alt={userName}
                                    />
                                    <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-primary/80 text-white">
                                        {getInitials(userName)}
                                    </AvatarFallback>
                                </Avatar>
                                {selectedFile && (
                                    <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1.5 border-4 border-white shadow-lg">
                                        <Check size={16} className="text-white" />
                                    </div>
                                )}
                            </div>

                            {/* File Input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="hidden"
                            />

                            {/* Action Buttons */}
                            <div className="flex gap-3 w-full">
                                {!selectedFile ? (
                                    <Button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex-1 gap-2"
                                        variant="outline"
                                    >
                                        <Upload size={18} />
                                        Choose Image
                                    </Button>
                                ) : (
                                    <>
                                        <Button
                                            onClick={handleRemove}
                                            className="flex-1 gap-2"
                                            variant="outline"
                                        >
                                            <X size={18} />
                                            Remove
                                        </Button>
                                        <Button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex-1 gap-2"
                                            variant="outline"
                                        >
                                            <Upload size={18} />
                                            Change
                                        </Button>
                                    </>
                                )}
                            </div>

                            {selectedFile && (
                                <div className="text-sm text-gray-600 text-center">
                                    <p className="font-medium">{selectedFile.name}</p>
                                    <p className="text-xs text-gray-500">
                                        {(selectedFile.size / 1024).toFixed(1)} KB
                                    </p>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="camera" className="space-y-4">
                        <div className="flex flex-col items-center gap-6 py-4">
                            {/* Camera View or Preview */}
                            {!previewUrl ? (
                                <div className="relative w-full max-w-sm aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        className="w-full h-full object-cover"
                                    />
                                    <canvas ref={canvasRef} className="hidden" />
                                    {!isCameraActive && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Camera size={48} className="text-gray-400" />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="relative">
                                    <Avatar className="h-32 w-32 border-4 border-gray-100">
                                        <AvatarImage src={previewUrl} alt="Captured photo" />
                                        <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-primary/80 text-white">
                                            {getInitials(userName)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1.5 border-4 border-white shadow-lg">
                                        <Check size={16} className="text-white" />
                                    </div>
                                </div>
                            )}

                            {/* Camera Controls */}
                            {isCameraActive && !previewUrl ? (
                                <Button
                                    onClick={capturePhoto}
                                    className="gap-2"
                                    size="lg"
                                >
                                    <Camera size={18} />
                                    Take Photo
                                </Button>
                            ) : previewUrl ? (
                                <div className="flex gap-3 w-full">
                                    <Button
                                        onClick={() => {
                                            setPreviewUrl(null);
                                            setSelectedFile(null);
                                            startCamera();
                                        }}
                                        className="flex-1 gap-2"
                                        variant="outline"
                                    >
                                        <X size={18} />
                                        Retake
                                    </Button>
                                </div>
                            ) : null}
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isUploading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleUpload}
                        disabled={!selectedFile || isUploading}
                        className="gap-2"
                    >
                        {isUploading ? (
                            <>
                                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Check size={18} />
                                Save Avatar
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
