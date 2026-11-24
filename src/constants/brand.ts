import type { ImageProps } from 'expo-image';

type BrandImage = ImageProps['source'];

// Brand files go in assets/brand/ and are wired here, e.g. menuHeader: require('../../assets/brand/menu-header.png').
export const brand: {
  menuHeader?: BrandImage;
  bannerAgenda?: BrandImage;
  bannerSideEvents?: BrandImage;
  bannerOpening?: BrandImage;
  venueMap?: BrandImage;
  wordmark?: BrandImage;
  artStoneBird?: BrandImage;
  artStoneSun?: BrandImage;
  artOwl?: BrandImage;
  artPegasus?: BrandImage;
} = {
  wordmark: require('../../assets/brand/wordmark.png'),
  // Speaker decoration strips (520x294): a stone piece on the left, a poster on the right; crop with ImageSlot `position`.
};