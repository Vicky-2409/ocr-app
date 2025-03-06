import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ocrService } from "@/services/api";
import { OcrResult as OcrResultType } from "@/types/api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { toast } from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { OcrResult } from "../components/OcrResult";

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [results, setResults] = useState<OcrResultType[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
      return;
    }

    if (isAuthenticated) {
      loadResults();
    }
  }, [isAuthenticated, isLoading, navigate]);

  const loadResults = async () => {
    setIsLoadingResults(true);
    try {
      const response = await ocrService.getUserResults();
      if (response.success) {
        setResults(response.data);
      }
    } catch (error) {
      console.error("Error loading results:", error);
      toast.error("Failed to load OCR history");
    } finally {
      setIsLoadingResults(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await ocrService.deleteResult(id);
      if (response.success) {
        setResults((prev) => prev.filter((result) => result.id !== id));
        toast.success("Result deleted successfully");
      }
    } catch (error) {
      console.error("Error deleting result:", error);
      toast.error("Failed to delete result");
    }
  };

  if (isLoading || isLoadingResults) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-secondary-900">OCR History</h1>
      </div>

      <div className="space-y-6">
        {results.map((result) => (
          <OcrResult key={result.id} result={result} onDelete={handleDelete} />
        ))}
        {results.length === 0 && (
          <div className="text-center py-12 text-secondary-500">
            No OCR history found. Process some images to see them here.
          </div>
        )}
      </div>
    </div>
  );
};
