import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ImageUpload } from "../components/ImageUpload";
import { OcrResult } from "../components/OcrResult";
import { ocrService } from "@/services/api";
import { OcrResult as OcrResultType } from "@/types/api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { toast } from "react-hot-toast";
import { Loader2, History, Upload, FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3, ease: "easeOut" },
};

const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
};

export const OcrPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentResult, setCurrentResult] = useState<OcrResultType | null>(
    null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>("");

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setProcessingStatus("Uploading image...");
    try {
      const response = await ocrService.processImage(file);
      if (response.success) {
        setCurrentResult(response.data);
        toast.success("Image processed successfully");
      }
    } catch (error) {
      console.error("Error processing image:", error);
      toast.error("Failed to process image");
    } finally {
      setIsUploading(false);
      setProcessingStatus("");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await ocrService.deleteResult(id);
      if (response.success) {
        setCurrentResult(null);
        toast.success("Result deleted successfully");
      }
    } catch (error) {
      console.error("Error deleting result:", error);
      toast.error("Failed to delete result");
    }
  };

  return (
    <motion.div
      {...fadeInUp}
      className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-primary-50 via-white to-secondary-50 py-12"
    >
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex flex-col gap-8">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1">
              <motion.h1
                className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-800"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                OCR Processing
              </motion.h1>
              <motion.p
                className="mt-2 text-secondary-600 max-w-xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Transform your images into editable text with our advanced OCR
                technology. Upload any document and get accurate text extraction
                in seconds.
              </motion.p>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Button
                variant="glass"
                onClick={() => navigate("/history")}
                className="flex items-center gap-2"
                rightIcon={<ArrowRight className="h-4 w-4" />}
                leftIcon={<History className="h-4 w-4" />}
              >
                View History
              </Button>
            </motion.div>
          </div>

          {/* Main Content */}
          <Card className="border-0 shadow-glass bg-white/80 backdrop-blur-md">
            <CardContent className="p-8">
              <AnimatePresence mode="wait">
                <motion.div key="upload-section" {...fadeIn}>
                  <ImageUpload
                    onUpload={handleUpload}
                    isUploading={isUploading}
                  />
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Results Section */}
          <AnimatePresence mode="wait">
            {currentResult ? (
              <motion.div
                key="result"
                {...fadeInUp}
                className="bg-white/90 backdrop-blur-sm rounded-xl shadow-glass p-8 border border-secondary-100"
              >
                <OcrResult result={currentResult} onDelete={handleDelete} />
              </motion.div>
            ) : !isUploading ? (
              <motion.div
                key="empty-state"
                {...fadeIn}
                className="text-center py-16"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                >
                  <div className="relative mx-auto w-fit">
                    <FileText className="h-16 w-16 text-primary-200" />
                    <Upload className="h-8 w-8 text-primary-400 absolute -right-2 -bottom-2" />
                  </div>
                </motion.div>
                <motion.p
                  className="text-secondary-600 mt-6 mb-4 text-lg"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Upload an image to start extracting text
                </motion.p>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <Button
                    variant="link"
                    onClick={() => navigate("/history")}
                    className="text-primary-600 hover:text-primary-700"
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    View previous results in history
                  </Button>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="processing"
                {...fadeIn}
                className="text-center py-16"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                >
                  <div className="relative mx-auto w-fit">
                    <FileText className="h-16 w-16 text-primary-200" />
                    <Upload className="h-8 w-8 text-primary-400 absolute -right-2 -bottom-2" />
                  </div>
                </motion.div>
                <motion.p
                  className="text-secondary-600 mt-6 mb-4 text-lg"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {processingStatus}
                </motion.p>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <Progress value={30} className="h-1 w-48 mx-auto" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
