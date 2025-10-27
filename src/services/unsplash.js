const UNSPLASH_ACCESS_KEY = '3mRQnmdKlbPt4Im-miwXXfGuNIdPAk4OE3tf4G75nG0'
const UNSPLASH_API_URL = 'https://api.unsplash.com'

const mapPhoto = (photo, quality) => ({
  id: photo.id,
  url: photo.urls[quality] || photo.urls.regular,
  thumb: photo.urls.thumb,
  small: photo.urls.small,
  regular: photo.urls.regular,
  full: photo.urls.full,
  raw: photo.urls.raw,
  width: photo.width,
  height: photo.height,
  description: photo.description || photo.alt_description,
  alt_description: photo.alt_description,
  color: photo.color,
  user: photo.user
    ? {
        name: photo.user.name,
        username: photo.user.username,
        profile_image: photo.user.profile_image?.small,
      }
    : null,
  created_at: photo.created_at,
  likes: photo.likes,
  downloads: photo.downloads,
})

export const searchDestinationImages = async (destination, options = {}) => {
  if (!destination || destination.trim().length < 2) return []

  const {
    limit = 5,
    orientation = 'landscape',
    quality = 'regular',
  } = options

  try {
    const params = new URLSearchParams({
      query: destination,
      per_page: limit.toString(),
      orientation,
      client_id: UNSPLASH_ACCESS_KEY,
    })

    const response = await fetch(`${UNSPLASH_API_URL}/search/photos?${params}`, {
      headers: {
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        'Accept-Version': 'v1',
      },
    })

    if (!response.ok) throw new Error(`HTTP error ${response.status}`)

    const data = await response.json()
    return (data.results || []).map((photo) => mapPhoto(photo, quality))
  } catch (error) {
    console.error('Error searching Unsplash images:', error)
    return []
  }
}

export const getFeaturedImage = async (destination, options = {}) => {
  try {
    const images = await searchDestinationImages(destination, {
      ...options,
      limit: 1,
    })
    return images.length > 0 ? images[0].url : null
  } catch (error) {
    console.error('Error getting featured image from Unsplash:', error)
    return null
  }
}
