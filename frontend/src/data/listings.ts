import apartment480 from '../assets/listings/apartment-480.webp';
import apartment960 from '../assets/listings/apartment-960.webp';
import camera480 from '../assets/listings/camera-480.webp';
import camera960 from '../assets/listings/camera-960.webp';
import laptop480 from '../assets/listings/gaming-laptop-480.webp';
import laptop960 from '../assets/listings/gaming-laptop-960.webp';
import car480 from '../assets/listings/honda-civic-480.webp';
import car960 from '../assets/listings/honda-civic-960.webp';
import phone480 from '../assets/listings/iphone-480.webp';
import phone960 from '../assets/listings/iphone-960.webp';
import motorcycle480 from '../assets/listings/motorcycle-480.webp';
import motorcycle960 from '../assets/listings/motorcycle-960.webp';
import bike480 from '../assets/listings/mountain-bike-480.webp';
import bike960 from '../assets/listings/mountain-bike-960.webp';
import tv480 from '../assets/listings/smart-tv-480.webp';
import tv960 from '../assets/listings/smart-tv-960.webp';
import sofa480 from '../assets/listings/sofa-480.webp';
import sofa960 from '../assets/listings/sofa-960.webp';
import type { Listing } from '../types/marketplace';

const responsive = (small: string, large: string) => `${small} 480w, ${large} 960w`;

export const listings: Listing[] = [
  {
    id: 'QV-100284', slug: 'honda-civic-oriel-2021', title: 'Honda Civic Oriel 1.8 2021', price: 6245000, currency: 'PKR',
    image: car960, imageSrcSet: responsive(car480, car960), imageAlt: 'Silver Honda Civic parked outside a modern building', location: 'DHA Phase 5, Lahore', postedAt: '2 hours ago', category: 'Cars', condition: 'Used',
    featured: true, sponsored: false, verified: true, seller: { name: 'Prime Wheels Demo', initials: 'PW', rating: 4.9, memberSince: '2021' },
    description: 'A carefully maintained sedan with complete demo service history, original documents, and a clean interior.', discoveryTags: ['popular', 'recommended'],
  },
  {
    id: 'QV-100285', slug: 'iphone-15-pro-256gb', title: 'iPhone 15 Pro 256GB — Natural Titanium', price: 245000, previousPrice: 259000, currency: 'PKR',
    image: phone960, imageSrcSet: responsive(phone480, phone960), imageAlt: 'Premium smartphone photographed on a clean neutral surface', location: 'Blue Area, Islamabad', postedAt: '3 hours ago', category: 'Mobiles', condition: 'Like new',
    featured: true, sponsored: true, verified: true, seller: { name: 'Pocket Tech Demo', initials: 'PT', rating: 4.8, memberSince: '2022' }, discoveryTags: ['nearby', 'price-drop', 'trending'],
  },
  {
    id: 'QV-100286', slug: 'honda-cb-150f-2023', title: 'Honda CB 150F 2023', price: 495000, currency: 'PKR',
    image: motorcycle960, imageSrcSet: responsive(motorcycle480, motorcycle960), imageAlt: 'Black commuter motorcycle photographed outdoors', location: 'F-10, Islamabad', postedAt: '5 hours ago', category: 'Motorcycles', condition: 'Used',
    featured: true, sponsored: false, verified: false, seller: { name: 'Roadline Demo', initials: 'RD', rating: 4.6, memberSince: '2023' }, discoveryTags: ['nearby', 'new'],
  },
  {
    id: 'QV-100287', slug: 'nordic-three-seater-sofa', title: 'Modern Nordic 3-Seater Sofa Set', price: 68000, currency: 'PKR',
    image: sofa960, imageSrcSet: responsive(sofa480, sofa960), imageAlt: 'Modern neutral three-seater sofa in a bright living room', location: 'Bahria Town, Rawalpindi', postedAt: 'Today', category: 'Furniture', condition: 'New',
    featured: true, sponsored: true, verified: true, seller: { name: 'Oakline Studio Demo', initials: 'OS', rating: 4.9, memberSince: '2020' }, discoveryTags: ['nearby', 'new', 'recommended'],
  },
  {
    id: 'QV-100288', slug: 'gaming-laptop-rtx-edition', title: 'Performance Gaming Laptop — 16GB / 1TB', price: 289000, currency: 'PKR',
    image: laptop960, imageSrcSet: responsive(laptop480, laptop960), imageAlt: 'Charcoal gaming laptop open on a modern desk with violet lighting', location: 'Gulberg, Lahore', postedAt: 'Today', category: 'Computers & Laptops', condition: 'Open box',
    featured: false, sponsored: true, verified: true, seller: { name: 'Pixel Station Demo', initials: 'PS', rating: 4.7, memberSince: '2021' }, discoveryTags: ['new', 'trending', 'recommended'],
  },
  {
    id: 'QV-100289', slug: 'smart-tv-55-inch-4k', title: '55-inch 4K Smart TV', price: 139500, previousPrice: 149500, currency: 'PKR',
    image: tv960, imageSrcSet: responsive(tv480, tv960), imageAlt: 'Thin-bezel smart television in a warm modern living room', location: 'Clifton, Karachi', postedAt: '1 day ago', category: 'Electronics', condition: 'New',
    featured: false, sponsored: true, verified: true, seller: { name: 'Living Tech Demo', initials: 'LT', rating: 4.8, memberSince: '2019' }, discoveryTags: ['popular', 'price-drop'],
  },
  {
    id: 'QV-100290', slug: 'trail-mountain-bike', title: 'Trail Mountain Bike — 27.5 inch', price: 82500, currency: 'PKR',
    image: bike960, imageSrcSet: responsive(bike480, bike960), imageAlt: 'Matte green mountain bike beside an urban park path', location: 'E-11, Islamabad', postedAt: '1 day ago', category: 'Sports & Fitness', condition: 'Like new',
    featured: false, sponsored: false, verified: true, seller: { name: 'Trail Works Demo', initials: 'TW', rating: 4.7, memberSince: '2023' }, discoveryTags: ['nearby', 'popular'],
  },
  {
    id: 'QV-100291', slug: 'mirrorless-camera-pro-kit', title: 'Mirrorless Camera Creator Kit', price: 225000, currency: 'PKR',
    image: camera960, imageSrcSet: responsive(camera480, camera960), imageAlt: 'Mirrorless camera and lens kit arranged on a studio surface', location: 'Model Town, Lahore', postedAt: '2 days ago', category: 'Electronics', condition: 'Used',
    featured: false, sponsored: false, verified: true, sold: true, seller: { name: 'Lens Room Demo', initials: 'LR', rating: 4.7, memberSince: '2020' }, discoveryTags: ['recommended'],
  },
  {
    id: 'QV-100292', slug: 'two-bed-apartment-bahria', title: 'Modern 2-Bed Apartment', price: 14800000, currency: 'PKR',
    image: apartment960, imageSrcSet: responsive(apartment480, apartment960), imageAlt: 'Bright contemporary two-bedroom apartment interior', location: 'Bahria Town, Rawalpindi', postedAt: '3 days ago', category: 'Property', condition: 'Ready',
    featured: false, sponsored: false, verified: true, seller: { name: 'Capital Spaces Demo', initials: 'CS', rating: 4.9, memberSince: '2018' }, discoveryTags: ['nearby', 'popular'],
  },
];

export const featuredListings = listings.filter((listing) => listing.featured);
export const promotedListings = listings.filter((listing) => listing.sponsored);
