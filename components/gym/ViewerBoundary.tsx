"use client";

import { Component, type ReactNode } from "react";

/**
 * Contains failures of a lazily loaded 3D viewer (code chunk failed to download on a flaky network,
 * texture failed to load, shader error…) so the caller can switch to the photo fallback instead of
 * the whole page crashing.
 */
export class ViewerBoundary extends Component<{ onError: (error: unknown) => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    this.props.onError(error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
