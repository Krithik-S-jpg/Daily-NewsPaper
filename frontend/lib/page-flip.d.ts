declare module "page-flip" {
  export class PageFlip {
    constructor(
      element: HTMLElement,
      settings: {
        width: number;
        height: number;
        size: "fixed" | "stretch";
        minWidth: number;
        maxWidth: number;
        minHeight: number;
        maxHeight: number;
        maxShadowOpacity: number;
        showCover: boolean;
        mobileScrollSupport: boolean;
        usePortrait: boolean;
        flippingTime: number;
        drawShadow: boolean;
        autoSize: boolean;
        startPage: number;
        useMouseEvents: boolean;
        showPageCorners: boolean;
        disableFlipByClick: boolean;
      },
    );
    loadFromHTML(elements: HTMLElement[]): void;
    on(event: "flip", handler: (event: { data: number }) => void): void;
    on(
      event: "changeOrientation",
      handler: (event: { data: string }) => void,
    ): void;
    getOrientation(): string;
    on(event: "changeState", handler: (event: { data: string }) => void): void;
    flipNext(): void;
    flipPrev(): void;
    flip(page: number): void;
    destroy(): void;
  }
}
