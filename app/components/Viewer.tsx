import { useEffect, useState } from "react";
import { OpenSeadragon } from "~/osd.client";

export const Viewer = ({
  id,
  className,
}: {
  id: string;
  className?: string;
}) => {
  const [initialized, setInitialized] = useState(false);
  const [storedId, setId] = useState(id);
  const domId = `${id}-viewer`;
  const [viewer, setViewer] = useState<OpenSeadragon.Viewer>();
  useEffect(() => {
    if (storedId != id) {
      viewer?.open(`https://zaydes-trees.s3.amazonaws.com/${id}/image.dzi`);
      setId(id);
    }
    if (!viewer) {
      setViewer(
        OpenSeadragon({
          id: domId,
          prefixUrl: "https://zaydes-trees.s3.amazonaws.com/",
          tileSources: `https://zaydes-trees.s3.amazonaws.com/${id}/image.dzi`,
        })
      );
      setInitialized(true);
    }
  });
  return <div className={className} id={domId} />;
};
