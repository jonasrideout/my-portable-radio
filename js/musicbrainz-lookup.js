// MusicBrainz Lookup for Album Information
class MusicBrainzLookup {
    constructor() {
        this.cache = new Map();
        this.lastRequestTime = 0;
        this.minRequestInterval = 1000; // 1 second between requests to be respectful
    }

    async lookupTrackInfo(artist, title) {
        const cacheKey = `${artist}|${title}`.toLowerCase();
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            // Rate limiting - wait if needed
            const timeSinceLastRequest = Date.now() - this.lastRequestTime;
            if (timeSinceLastRequest < this.minRequestInterval) {
                await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest));
            }

            const query = `artist:"${artist}" AND recording:"${title}"`;
            const url = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&fmt=json&limit=5`;
            
            console.log('MusicBrainz lookup:', { artist, title, url });
            this.lastRequestTime = Date.now();

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const result = this.parseResponse(data, artist, title);
            
            // Cache the result (even if null)
            this.cache.set(cacheKey, result);
            
            return result;

        } catch (error) {
            console.log('MusicBrainz lookup failed:', error);
            // Cache null result to avoid repeated failed lookups
            this.cache.set(cacheKey, null);
            return null;
        }
    }

    parseResponse(data, originalArtist, originalTitle) {
        if (!data.recordings || data.recordings.length === 0) {
            return null;
        }

        // Look for the best match
        for (const recording of data.recordings) {
            if (!recording.releases || recording.releases.length === 0) {
                continue;
            }

            // Find the earliest release with a date
            let bestRelease = null;
            let earliestYear = null;

            for (const release of recording.releases) {
                if (release.date) {
                    const year = parseInt(release.date.substring(0, 4));
                    if (year && (!earliestYear || year < earliestYear)) {
                        earliestYear = year;
                        bestRelease = release;
                    }
                }
            }

            if (bestRelease && earliestYear) {
                console.log('MusicBrainz found:', {
                    album: bestRelease.title,
                    year: earliestYear,
                    for: `${originalArtist} - ${originalTitle}`
                });

                return {
                    album: bestRelease.title,
                    year: earliestYear
                };
            }
        }

        return null;
    }

    clearCache() {
        this.cache.clear();
    }
}
