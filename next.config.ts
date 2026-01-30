import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
	trailingSlash: false,
	images: {
		remotePatterns: [
			{ protocol: 'https', hostname: 'images.unsplash.com' },
			{ protocol: 'https', hostname: 'loremflickr.com' },
			{ protocol: 'https', hostname: 'picsum.photos' },
			{ protocol: 'https', hostname: '*.andy-cinquin.fr' },
			{ protocol: 'https', hostname: 'cdnjs.cloudflare.com' },
		],
		qualities: [75, 90, 100], // Add quality configurations
	},
}

export default nextConfig
