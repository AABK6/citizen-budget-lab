
import React from 'react';

const SkeletonBox = ({ className }: { className?: string }) => (
  <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
);

export const BuildPageSkeleton = () => {
  return (
    <div className="build-page-container">
      {/* HUD Bar Skeleton */}
      <div className="hud-bar">
        <div className="hud-left">
          <SkeletonBox className="w-32 h-8" />
          <div className="resolution-meter">
            <SkeletonBox className="w-20 h-6" />
            <SkeletonBox className="w-48 h-4 ml-2" />
            <SkeletonBox className="w-12 h-6 ml-2" />
          </div>
        </div>
        <div className="hud-right">
          <SkeletonBox className="w-20 h-10" />
          <SkeletonBox className="w-24 h-8 ml-4" />
          <SkeletonBox className="w-32 h-8 ml-4" />
          <div className="nav-controls ml-4">
            <SkeletonBox className="w-10 h-10" />
            <SkeletonBox className="w-10 h-10 ml-2" />
            <SkeletonBox className="w-10 h-10 ml-2" />
          </div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="main-content">
        {/* Left Panel Skeleton */}
        <div className="left-panel">
          <SkeletonBox className="w-48 h-8 mb-4" />
          {[...Array(5)].map((_, index) => (
            <div key={index} className="spending-category mb-4">
              <div className="category-header">
                <SkeletonBox className="w-3/4 h-6" />
                <SkeletonBox className="w-1/4 h-6" />
              </div>
              <div className="category-controls mt-2">
                <SkeletonBox className="w-24 h-8" />
                <SkeletonBox className="w-24 h-8 ml-2" />
              </div>
            </div>
          ))}
        </div>

        {/* Center Panel Skeleton */}
        <div className="center-panel">
          <div className="lens-switcher">
            <SkeletonBox className="w-20 h-8" />
            <SkeletonBox className="w-20 h-8 ml-2" />
            <SkeletonBox className="w-20 h-8 ml-2" />
          </div>
          <div className="treemap-container mt-4">
            <SkeletonBox className="w-full h-64" />
          </div>
          <div className="scenario-charts mt-4">
            <div className="flex justify-between">
                <SkeletonBox className="w-1/2 h-24" />
                <SkeletonBox className="w-1/2 h-24 ml-2" />
            </div>
            <SkeletonBox className="w-full h-64 mt-4" />
          </div>
        </div>

        {/* Right Panel Skeleton */}
        <div className="right-panel">
          <SkeletonBox className="w-32 h-8 mb-4" />
          {[...Array(5)].map((_, index) => (
            <div key={index} className="revenue-category mb-4">
              <div className="category-header">
                <SkeletonBox className="w-3/4 h-6" />
                <SkeletonBox className="w-1/4 h-6" />
              </div>
              <div className="category-controls mt-2">
                <SkeletonBox className="w-24 h-8" />
                <SkeletonBox className="w-24 h-8 ml-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
