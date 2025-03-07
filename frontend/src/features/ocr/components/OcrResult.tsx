import React, { useState } from "react";
import { OcrResult as OcrResultType } from "@/types/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Trash2,
  Clock,
  Calendar,
  Copy,
  Check,
  Image as ImageIcon,
  FileText,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface OcrResultProps {
  result: OcrResultType;
  onDelete?: (id: string) => void;
}

export const OcrResult: React.FC<OcrResultProps> = ({ result, onDelete }) => {
  const [copied, setCopied] = useState(false);
  const imageUrl = result.imageUrl;

  const handleCopy = () => {
    navigator.clipboard.writeText(result.extractedText || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="w-full max-w-4xl mx-auto overflow-hidden bg-white/90 backdrop-blur-sm border-secondary-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-secondary-100">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-primary-50">
              <FileText className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-secondary-900">
                OCR Result
              </h3>
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  result.status === "success"
                    ? "bg-success-50 text-success-700 border border-success-200"
                    : "bg-error-50 text-error-700 border border-error-200"
                }`}
              >
                {result.status}
              </motion.span>
            </div>
          </div>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(result.id)}
              className="text-secondary-500 hover:text-error-600 hover:bg-error-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>

        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm font-medium text-secondary-700">
                <ImageIcon className="h-4 w-4 text-secondary-500" />
                <span>Original Image</span>
              </div>
            </div>
            <div className="relative aspect-video rounded-lg overflow-hidden bg-secondary-900/5 backdrop-blur-sm shadow-inner">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Original document"
                  className="object-contain w-full h-full"
                  onError={(e) => {
                    console.error("Error loading image:", imageUrl);
                    e.currentTarget.src = "/placeholder-image.png"; // Add a placeholder image
                    e.currentTarget.alt = "Image failed to load";
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-secondary-500">
                    Image not available
                  </span>
                </div>
              )}
              <div className="absolute inset-0 ring-1 ring-inset ring-secondary-900/10 rounded-lg" />
            </div>
          </motion.div>

          <motion.div
            className="space-y-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm font-medium text-secondary-700">
                <FileText className="h-4 w-4 text-secondary-500" />
                <span>Extracted Text</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="text-secondary-600 hover:text-primary-600 hover:bg-primary-50"
              >
                <AnimatePresence mode="wait">
                  {copied ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0.5 }}
                      className="flex items-center space-x-1"
                    >
                      <Check className="h-4 w-4" />
                      <span>Copied!</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="copy"
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0.5 }}
                      className="flex items-center space-x-1"
                    >
                      <Copy className="h-4 w-4" />
                      <span>Copy text</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-secondary-50/50 backdrop-blur-[2px] rounded-lg -z-10" />
              <div className="whitespace-pre-wrap p-4 rounded-lg text-sm min-h-[200px] border border-secondary-200 bg-white/40">
                {result.extractedText || "No text extracted"}
              </div>
            </div>
          </motion.div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row sm:justify-between gap-4 text-sm text-secondary-600 border-t border-secondary-100 bg-secondary-50/30">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5">
              <Clock className="h-4 w-4 text-secondary-400" />
              <span>{result.processingTime}ms</span>
            </div>
            <div className="h-4 w-px bg-secondary-200" />
            <div className="flex items-center space-x-1.5">
              <Calendar className="h-4 w-4 text-secondary-400" />
              <span>{formatDate(result.createdAt)}</span>
            </div>
          </div>
        </CardFooter>

        <AnimatePresence>
          {result.error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 mx-4 mb-4"
            >
              <div className="flex items-start space-x-3 p-4 bg-error-50 text-error-800 rounded-lg border border-error-200">
                <AlertCircle className="h-5 w-5 text-error-500 flex-shrink-0" />
                <div className="flex-1 text-sm">
                  <p className="font-medium">Processing Error</p>
                  <p className="mt-1 text-error-700">{result.error}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};
