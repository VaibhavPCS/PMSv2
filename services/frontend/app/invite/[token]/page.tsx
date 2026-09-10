'use client';

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { postData } from "@/lib/fetch-util";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle } from "lucide-react";

const AcceptInvite = () => {
  const params = useParams();
  const token = (params?.token as string) || "";
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [accepting, setAccepting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated && token) {
      acceptInvite();
    } else if (!isAuthenticated) {
      // Redirect to login with return URL
      router.push(`/sign-in?returnTo=/invite/${token}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token]);

  const acceptInvite = async () => {
    try {
      setAccepting(true);
      const response = await postData(`/workspace/invite/accept/${token}`, {});

      setSuccess(true);
      toast.success("Successfully joined workspace!");

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);

    } catch (error: any) {
      console.error('Failed to accept invite:', error);
      const message = error.response?.data?.message || "Failed to accept invitation";
      setError(message);
      toast.error(message);
    } finally {
      setAccepting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Please sign in to accept the invitation</h2>
          <p className="text-gray-600">You'll be redirected to sign in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          {accepting && (
            <>
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold mb-2">Accepting Invitation...</h2>
              <p className="text-gray-600">Please wait while we add you to the workspace.</p>
            </>
          )}

          {success && (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-green-700 mb-2">Welcome to the workspace!</h2>
              <p className="text-gray-600 mb-4">You have successfully joined the workspace.</p>
              <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
            </>
          )}

          {error && (
            <>
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-red-700 mb-2">Invitation Error</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => router.push("/dashboard")} variant="outline">
                Go to Dashboard
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AcceptInvite;
