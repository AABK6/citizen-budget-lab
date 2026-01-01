
import React from 'react';

type ErrorDisplayProps = {
  message: string;
  onRetry?: () => void;
};

export const ErrorDisplay = ({ message, onRetry }: ErrorDisplayProps) => {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-red-50 border border-red-200 rounded-lg p-8">
      <div className="text-red-600">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="mt-4 text-xl font-semibold text-red-800">Oups, une erreur est survenue.</h2>
      <p className="mt-2 text-red-600">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Réessayer
        </button>
      )}
    </div>
  );
};
