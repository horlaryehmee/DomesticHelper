import { forwardRef } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { useFeatures } from "@/lib/features";
/** Disabled modules never leave actionable links in another feature's UI. */
export const FeatureLink = forwardRef<HTMLAnchorElement, LinkProps>(
  function FeatureLink(props, ref) {
    const { canVisit } = useFeatures();
    const path =
      typeof props.to === "string" ? props.to : (props.to.pathname ?? "");
    if (!canVisit(path)) return null;
    return <Link {...props} ref={ref} />;
  },
);
