import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { Stack, Note } from "@contentful/f36-components";
import { ChevronDownIcon, CloseIcon } from "@contentful/f36-icons";

// Cloudinary logo SVG component - memoized to prevent re-renders
const CloudinaryIcon = memo(({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.5 6.5C10.5 6.5 8.8 7.6 7.9 9.2C7.5 9.1 7.1 9 6.7 9C4.5 9 2.7 10.8 2.7 13C2.7 15.2 4.5 17 6.7 17H17.3C19.5 17 21.3 15.2 21.3 13C21.3 11.1 19.9 9.5 18.1 9.1C17.8 7.5 16.3 6.3 14.5 6.3C14 6.3 13.5 6.4 13.1 6.5C12.9 6.5 12.7 6.5 12.5 6.5Z" fill="#3448C5"/>
  </svg>
));

// Drag handle icon component
const DragHandleIcon = memo(() => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="5" cy="4" r="1.5" fill="#9CA3AF"/>
    <circle cx="11" cy="4" r="1.5" fill="#9CA3AF"/>
    <circle cx="5" cy="8" r="1.5" fill="#9CA3AF"/>
    <circle cx="11" cy="8" r="1.5" fill="#9CA3AF"/>
    <circle cx="5" cy="12" r="1.5" fill="#9CA3AF"/>
    <circle cx="11" cy="12" r="1.5" fill="#9CA3AF"/>
  </svg>
));

// Memoized AssetCard component for better performance
const AssetCard = memo(({ asset, index, thumbnailUrl, fileName, dimensions, fileSize, onRemove, onDragStart, onDragOver, onDrop, onDragEnd, isDragging }) => (
  <div
    draggable
    onDragStart={(e) => onDragStart(e, index)}
    onDragOver={onDragOver}
    onDrop={(e) => onDrop(e, index)}
    onDragEnd={onDragEnd}
    style={{
      position: "relative",
      display: "flex",
      flexDirection: "row",
      border: isDragging ? "2px dashed #3448C5" : "1px solid #E5E5E5",
      borderRadius: "6px",
      background: isDragging ? "#F0F4FF" : "#fff",
      overflow: "visible",
      opacity: isDragging ? 0.5 : 1,
      transition: "border 0.2s, background 0.2s, opacity 0.2s",
    }}
  >
    {/* Drag handle on left */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "32px",
        minWidth: "32px",
        background: "#F7F9FA",
        borderRight: "1px solid #E5E5E5",
        borderRadius: "6px 0 0 6px",
        cursor: "grab",
      }}
    >
      <DragHandleIcon />
    </div>
    
    {/* Main content area */}
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {/* Close button on top right */}
      <button
        onClick={() => onRemove(index)}
        style={{
          position: "absolute",
          top: "-10px",
          right: "-10px",
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          background: "#CF3D3D",
          border: "2px solid #fff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          zIndex: 10,
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
        }}
        aria-label="Remove asset"
      >
        <CloseIcon size="tiny" variant="white" />
      </button>
      
      {/* Image area */}
      <div
        style={{
          width: "100%",
          height: "140px",
          position: "relative",
          background: "#F7F9FA",
          borderRadius: "0 6px 0 0",
          overflow: "hidden",
        }}
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={fileName}
            loading="lazy"
            decoding="async"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CloudinaryIcon size={40} />
          </div>
        )}
      </div>
      
      {/* Info at bottom */}
      <div style={{ padding: "8px", borderTop: "1px solid #E5E5E5" }}>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "#192532",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginBottom: "4px",
          }}
          title={fileName}
        >
          {fileName}
        </div>
        <div style={{ fontSize: "12px", color: "#6B7280", display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {dimensions && <span>{dimensions}</span>}
          {fileSize && <span>{fileSize}</span>}
        </div>
      </div>
    </div>
  </div>
));

// Cache for Cloudinary script loading state
let cloudinaryScriptPromise = null;

const loadCloudinaryScript = () => {
  if (window.cloudinary?.createMediaLibrary) return Promise.resolve();
  if (cloudinaryScriptPromise) return cloudinaryScriptPromise;
  
  cloudinaryScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://media-library.cloudinary.com/global/all.js";
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  
  return cloudinaryScriptPromise;
};

const CloudinaryField = ({ sdk, widgetId }) => {
  const [value, setValue] = useState(() => sdk.field.getValue());
  const [cloudinaryReady, setCloudinaryReady] = useState(() => !!window.cloudinary);
  const widgetRef = useRef(null);

  // Memoize config to prevent unnecessary recalculations
  const config = useMemo(() => ({
    cloudinaryEnabled: sdk.parameters?.installation?.cloudinaryEnabled,
    cloudName: sdk.parameters?.installation?.cloudinaryCloudName,
    apiKey: sdk.parameters?.installation?.cloudinaryApiKey,
    uploadPreset: sdk.parameters?.installation?.cloudinaryUploadPreset,
    maxFiles: sdk.parameters?.installation?.cloudinaryMaxFiles,
    startingFolder: sdk.parameters?.installation?.cloudinaryStartingFolder,
    mediaQuality: sdk.parameters?.installation?.cloudinaryMediaQuality,
    format: sdk.parameters?.installation?.cloudinaryFormat,
    showUploadButton: sdk.parameters?.installation?.cloudinaryShowUploadButton,
    resourceType: sdk.parameters?.instance?.resourceType || "all",
    searchFilter: sdk.parameters?.instance?.searchFilter || "",
  }), [sdk.parameters]);

  const { 
    cloudinaryEnabled, 
    cloudName, 
    apiKey,
    uploadPreset, 
    maxFiles, 
    startingFolder, 
    mediaQuality, 
    format, 
    showUploadButton, 
    resourceType, 
    searchFilter 
  } = config;

  useEffect(() => {
    const detach = sdk.field.onValueChanged(setValue);
    return detach;
  }, [sdk.field]);

  useEffect(() => {
    if (!cloudinaryEnabled || !cloudName) return;
    
    loadCloudinaryScript()
      .then(() => setCloudinaryReady(true))
      .catch((err) => console.error("Failed to load Cloudinary script:", err));
  }, [cloudinaryEnabled, cloudName]);

  // Memoize widget config for Media Library
  const widgetConfig = useMemo(() => {
    const cfg = {
      cloud_name: cloudName,
      api_key: apiKey,
      multiple: true,
      inline_container: null,
      remove_header: false,
    };

    if (maxFiles && parseInt(maxFiles) > 0) {
      cfg.max_files = parseInt(maxFiles);
    }
    if (startingFolder) {
      cfg.folder = { path: startingFolder };
    }

    const transformations = [];
    if (mediaQuality && mediaQuality !== "none") {
      transformations.push({ quality: mediaQuality });
    }
    if (format && format !== "none") {
      transformations.push({ fetch_format: format });
    }
    if (transformations.length > 0) {
      cfg.default_transformations = [transformations];
    }

    if (resourceType && resourceType !== "all") {
      cfg.resource_type = resourceType;
    }
    if (searchFilter) {
      cfg.search = { expression: searchFilter };
    }
    if (showUploadButton === false) {
      cfg.insert_caption = "Select";
      cfg.show_upload_button = false;
    }

    return cfg;
  }, [
    cloudName, 
    apiKey, 
    maxFiles, 
    startingFolder, 
    mediaQuality, 
    format, 
    resourceType, 
    searchFilter, 
    showUploadButton
  ]);

  // Media Library insert handler
  const handleInsert = useCallback((data) => {
    if (data.assets?.length > 0) {
      const currentValue = sdk.field.getValue() || [];
      const newAssets = Array.isArray(currentValue) 
        ? [...currentValue, ...data.assets]
        : data.assets;
      sdk.field.setValue(newAssets);
    }
  }, [sdk.field]);

  const openCloudinaryPicker = useCallback(() => {
    if (!window.cloudinary?.createMediaLibrary || !cloudName) return;

    const widget = window.cloudinary.createMediaLibrary(
      widgetConfig,
      { insertHandler: handleInsert }
    );

    widget.show();
  }, [cloudName, widgetConfig, handleInsert]);

  const removeAsset = useCallback((indexToRemove) => {
    const currentValue = sdk.field.getValue();
    if (Array.isArray(currentValue)) {
      const newValue = currentValue.filter((_, i) => i !== indexToRemove);
      sdk.field.setValue(newValue.length > 0 ? newValue : undefined);
    } else {
      sdk.field.removeValue();
    }
  }, [sdk.field]);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState(null);

  const handleDragStart = useCallback((e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const currentValue = sdk.field.getValue();
    if (!Array.isArray(currentValue)) return;

    const newAssets = [...currentValue];
    const [draggedItem] = newAssets.splice(draggedIndex, 1);
    newAssets.splice(dropIndex, 0, draggedItem);
    
    sdk.field.setValue(newAssets);
    setDraggedIndex(null);
  }, [draggedIndex, sdk.field]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  // Memoized thumbnail URL generator
  const getAssetThumbnail = useCallback((asset) => {
    const baseUrl = asset.secure_url || asset.url;
    if (!baseUrl) return null;

    const isImage = asset.resource_type === "image" || 
      (!asset.resource_type && /^(jpg|jpeg|png|gif|webp)$/i.test(asset.format));
    
    if (isImage) {
      return baseUrl.replace("/upload/", "/upload/c_fill,h_140,w_200,q_auto,f_auto/");
    }
    
    if (asset.resource_type === "video") {
      return baseUrl
        .replace("/video/upload/", "/video/upload/c_fill,h_140,w_200,so_0/")
        .replace(/\.[^.]+$/, ".jpg");
    }

    return baseUrl;
  }, []);

  const formatFileSize = useCallback((bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }, []);

  // Memoized assets for rendering
  const assets = useMemo(() => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }, [value]);

  const hasAssets = assets.length > 0;

  if (!cloudinaryEnabled) {
    return (
      <Note variant="warning">
        Cloudinary integration is not enabled. Please enable it in the app configuration.
      </Note>
    );
  }

  if (!cloudName) {
    return (
      <Note variant="warning">
        Cloudinary is not configured. Please enter your Cloud Name in the app configuration.
      </Note>
    );
  }

  return (
    <Stack flexDirection="column" spacing="spacingS" alignItems="flex-start">
      {hasAssets && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, 232px)",
            gap: "16px",
            marginBottom: "16px",
            padding: "12px",
            marginLeft: "-12px",
            marginTop: "-12px",
            alignSelf: "start",
          }}
        >
          {assets.map((asset, index) => (
            <AssetCard
              key={asset.public_id || index}
              asset={asset}
              index={index}
              thumbnailUrl={getAssetThumbnail(asset)}
              fileName={asset.public_id?.split("/").pop() || asset.public_id || "Asset"}
              dimensions={asset.width && asset.height ? `${asset.width} × ${asset.height}` : ""}
              fileSize={formatFileSize(asset.bytes)}
              onRemove={removeAsset}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              isDragging={draggedIndex === index}
            />
          ))}
        </div>
      )}
      <button
        onClick={openCloudinaryPicker}
        disabled={!cloudinaryReady}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 12px",
          background: "#fff",
          border: "1px solid #CFD9E0",
          borderRadius: "6px",
          cursor: cloudinaryReady ? "pointer" : "not-allowed",
          fontSize: "14px",
          fontWeight: 500,
          color: "#192532",
          opacity: cloudinaryReady ? 1 : 0.6,
          width: "fit-content",
        }}
      >
        <CloudinaryIcon size={20} />
        <span>Select an Asset</span>
        <ChevronDownIcon size="small" variant="secondary" />
      </button>
    </Stack>
  );
};

export default CloudinaryField;
