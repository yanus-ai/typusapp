/**
 * Utility functions for extracting and formatting settings from image settingsSnapshot
 */

export interface ExtractedSettings {
  // Display settings (for UI)
  displaySettings: Array<{ label: string; value: string }>;
  // Texture URLs
  surroundingUrls: string[];
  wallsUrls: string[];
  // Raw settings for applying (for Redux)
  settingsToApply: any;
  // Model for applying
  model?: string;
}

/**
 * Extract settings from an image's settingsSnapshot for display purposes
 */
export function extractDisplaySettings(image: any): ExtractedSettings | null {
  if (!image?.settingsSnapshot) return null;

  const snapshot = image.settingsSnapshot as any;
  const settingsList: { label: string; value: string }[] = [];

  // Model
  if (snapshot.model) {
    const modelDisplay =
      snapshot.model === "flux-konect"
        ? "Flux"
        : snapshot.model === "sdxl"
        ? "SDXL"
        : snapshot.model || "Unknown";
    settingsList.push({ label: "Model", value: modelDisplay });
  }

  // Size
  if (snapshot.size) {
    settingsList.push({ label: "Size", value: snapshot.size });
  }

  // Aspect Ratio
  if (snapshot.aspectRatio) {
    settingsList.push({ label: "Aspect Ratio", value: snapshot.aspectRatio });
  }

  // Variations
  if (snapshot.variations) {
    settingsList.push({ label: "Variations", value: `${snapshot.variations}` });
  }

  // Style/Mode
  if (snapshot.mode || snapshot.selectedStyle) {
    const style = snapshot.mode || snapshot.selectedStyle;
    const styleDisplay =
      style === "photorealistic"
        ? "Photorealistic"
        : style === "art"
        ? "Art"
        : style || "Unknown";
    settingsList.push({ label: "Style", value: styleDisplay });
  }

  // Slider values (only show if they're not default)
  if (snapshot.creativity !== undefined && snapshot.creativity !== 50) {
    settingsList.push({
      label: "Creativity",
      value: `${snapshot.creativity}%`,
    });
  }
  if (snapshot.expressivity !== undefined && snapshot.expressivity !== 50) {
    settingsList.push({
      label: "Expressivity",
      value: `${snapshot.expressivity}%`,
    });
  }
  if (snapshot.resemblance !== undefined && snapshot.resemblance !== 50) {
    settingsList.push({
      label: "Resemblance",
      value: `${snapshot.resemblance}%`,
    });
  }
  if (snapshot.dynamics !== undefined && snapshot.dynamics !== 50) {
    settingsList.push({ label: "Dynamics", value: `${snapshot.dynamics}%` });
  }

  // Extract texture URLs from attachments
  const attachments = snapshot.attachments;
  const surroundingUrls =
    attachments?.surroundingUrls ||
    (attachments?.textureUrls
      ? attachments.textureUrls.slice(
          0,
          Math.floor(attachments.textureUrls.length / 2)
        )
      : []);
  const wallsUrls =
    attachments?.wallsUrls ||
    (attachments?.textureUrls
      ? attachments.textureUrls.slice(
          Math.floor(attachments.textureUrls.length / 2)
        )
      : []);

  // Extract settings for applying (only include defined values)
  const settingsToApply: any = {};

  if (snapshot.mode !== undefined || snapshot.selectedStyle !== undefined) {
    settingsToApply.selectedStyle = snapshot.mode || snapshot.selectedStyle;
  }
  if (snapshot.variations !== undefined && snapshot.variations !== null) {
    settingsToApply.variations = snapshot.variations;
  }
  if (snapshot.aspectRatio !== undefined) {
    settingsToApply.aspectRatio = snapshot.aspectRatio;
  }
  if (snapshot.size !== undefined) {
    settingsToApply.size = snapshot.size;
  }
  if (snapshot.creativity !== undefined) {
    settingsToApply.creativity = snapshot.creativity;
  }
  if (snapshot.expressivity !== undefined) {
    settingsToApply.expressivity = snapshot.expressivity;
  }
  if (snapshot.resemblance !== undefined) {
    settingsToApply.resemblance = snapshot.resemblance;
  }
  if (snapshot.dynamics !== undefined) {
    settingsToApply.dynamics = snapshot.dynamics;
  }
  if (snapshot.tilingWidth !== undefined) {
    settingsToApply.tilingWidth = snapshot.tilingWidth;
  }
  if (snapshot.tilingHeight !== undefined) {
    settingsToApply.tilingHeight = snapshot.tilingHeight;
  }

  // Build selections object
  const selections: any = {};
  if (snapshot.buildingType !== undefined) {
    selections.type = snapshot.buildingType;
  }
  if (snapshot.category !== undefined) {
    selections.walls = { category: snapshot.category };
  }
  if (snapshot.context !== undefined) {
    selections.context = snapshot.context;
  }
  if (snapshot.styleSelection !== undefined) {
    selections.style = snapshot.styleSelection;
  }
  if (snapshot.regions) {
    Object.assign(selections, snapshot.regions);
  }
  if (Object.keys(selections).length > 0) {
    settingsToApply.selections = selections;
  }

  // Add image-specific fields
  if (image.maskMaterialMappings) {
    settingsToApply.maskMaterialMappings = image.maskMaterialMappings;
  }
  if (image.contextSelection !== undefined) {
    settingsToApply.contextSelection = image.contextSelection;
  }
  if (image.aiPrompt) {
    settingsToApply.generatedPrompt = image.aiPrompt;
  }
  if (image.aiMaterials) {
    settingsToApply.aiMaterials = image.aiMaterials;
  }

  return {
    displaySettings: settingsList,
    surroundingUrls,
    wallsUrls,
    settingsToApply,
    model: snapshot.model,
  };
}

/**
 * Extract settings from an image for applying to Redux state (simpler version for page.tsx)
 * Returns both settings object and model
 */
export function extractSettingsForApplication(image: any): {
  settings: any;
  model?: string;
} {
  if (!image) return { settings: {} };

  const settings: any = {};

  // Add image-specific fields first
  if (image.maskMaterialMappings) {
    settings.maskMaterialMappings = image.maskMaterialMappings;
  }
  if (image.contextSelection !== undefined) {
    settings.contextSelection = image.contextSelection;
  }
  if (image.aiPrompt) {
    settings.generatedPrompt = image.aiPrompt;
  }
  if (image.aiMaterials) {
    settings.aiMaterials = image.aiMaterials;
  }

  let model: string | undefined;

  // Merge settingsSnapshot if available
  if (image.settingsSnapshot) {
    const snapshot = image.settingsSnapshot as any;

    // Extract model
    if (snapshot.model) {
      model = snapshot.model;
    }

    // Only include defined values to avoid overwriting with undefined
    if (snapshot.mode !== undefined || snapshot.selectedStyle !== undefined) {
      settings.selectedStyle = snapshot.mode || snapshot.selectedStyle;
    }
    if (snapshot.variations !== undefined && snapshot.variations !== null) {
      settings.variations = snapshot.variations;
    }
    if (snapshot.aspectRatio !== undefined) {
      settings.aspectRatio = snapshot.aspectRatio;
    }
    if (snapshot.size !== undefined) {
      settings.size = snapshot.size;
    }
    if (snapshot.creativity !== undefined) {
      settings.creativity = snapshot.creativity;
    }
    if (snapshot.expressivity !== undefined) {
      settings.expressivity = snapshot.expressivity;
    }
    if (snapshot.resemblance !== undefined) {
      settings.resemblance = snapshot.resemblance;
    }
    if (snapshot.dynamics !== undefined) {
      settings.dynamics = snapshot.dynamics;
    }
    if (snapshot.tilingWidth !== undefined) {
      settings.tilingWidth = snapshot.tilingWidth;
    }
    if (snapshot.tilingHeight !== undefined) {
      settings.tilingHeight = snapshot.tilingHeight;
    }

    // Build selections object
    const selections: any = {};
    if (snapshot.buildingType !== undefined) {
      selections.type = snapshot.buildingType;
    }
    if (snapshot.category !== undefined) {
      selections.walls = { category: snapshot.category };
    }
    if (snapshot.context !== undefined) {
      selections.context = snapshot.context;
    }
    if (snapshot.styleSelection !== undefined) {
      selections.style = snapshot.styleSelection;
    }
    if (snapshot.regions) {
      Object.assign(selections, snapshot.regions);
    }
    if (Object.keys(selections).length > 0) {
      settings.selections = selections;
    }
  }

  return { settings, model };
}
