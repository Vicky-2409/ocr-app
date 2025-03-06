import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Image as ImageIcon, AlertCircle, X } from "lucide-react";
import { isValidImageFile } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ImageUploadProps {
  onUpload: (file: File) => void;
  isUploading: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onUpload,
  isUploading,
}) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setPreviewImage(URL.createObjectURL(file));
        onUpload(file);
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      accept: {
        "image/*": [".jpeg", ".jpg", ".png"],
      },
      maxSize: 5 * 1024 * 1024, // 5MB
      multiple: false,
      validator: (file) => {
        if (!isValidImageFile(file)) {
          return {
            code: "invalid-file",
            message: "Please upload a valid image file (JPEG or PNG) under 5MB",
          };
        }
        return null;
      },
    });

  const clearPreview = () => {
    setPreviewImage(null);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <AnimatePresence mode="wait">
        {!previewImage ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div
              {...getRootProps()}
              className={`relative overflow-hidden rounded-xl border-2 border-dashed p-8 text-center transition-all ${
                isDragActive
                  ? "border-primary-400 bg-primary-50/50 shadow-lg"
                  : "border-secondary-200 hover:border-primary-400 hover:bg-primary-50/30"
              }`}
            >
              <input {...getInputProps()} />
              
              {/* Animated Background Pattern */}
              <div className="absolute inset-0 -z-10 opacity-[0.03]">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,#000_25%,transparent_25%,transparent_75%,#000_75%,#000),linear-gradient(45deg,#000_25%,transparent_25%,transparent_75%,#000_75%,#000)] bg-[length:60px_60px] bg-[position:0_0,30px_30px]" />
              </div>

              <motion.div 
                className="flex flex-col items-center space-y-6"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <motion.div 
                  className="relative"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="p-4 rounded-full bg-primary-100 shadow-inner">
                    <Upload className="h-8 w-8 text-primary-600" />
                  </div>
                  {isDragActive && (
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 0.8, 0.5],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <div className="w-full h-full rounded-full bg-primary-200/30 backdrop-blur-sm" />
                    </motion.div>
                  )}
                </motion.div>

                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-secondary-900">
                    {isDragActive ? "Drop your image here" : "Upload an image"}
                  </h3>
                  <p className="text-secondary-600">
                    Drag and drop an image, or click to browse
                  </p>
                </div>

                <div className="flex items-center justify-center space-x-4 text-sm text-secondary-500">
                  <div className="flex items-center space-x-1.5">
                    <ImageIcon className="h-4 w-4" />
                    <span>JPEG, PNG</span>
                  </div>
                  <div className="h-4 w-px bg-secondary-200" />
                  <span>Up to 5MB</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative rounded-xl overflow-hidden shadow-lg"
          >
            <img
              src={previewImage}
              alt="Preview"
              className="w-full h-64 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <p className="text-sm opacity-90">Processing your image...</p>
            </div>
            {!isUploading && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearPreview}
                className="absolute top-2 right-2 text-white hover:bg-black/20"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {fileRejections.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4"
          >
            <div className="p-4 bg-error-50 text-error-800 rounded-xl border border-error-200 shadow-sm">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-error-500" />
                <div>
                  <p className="font-medium">Invalid file</p>
                  <p className="mt-1 text-sm text-error-600">{fileRejections[0].errors[0].message}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {isUploading && !fileRejections.length && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-4"
          >
            <Button
              disabled
              variant="outline"
              loading
              className="w-full bg-white/50 backdrop-blur-sm"
            >
              Processing your image...
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
