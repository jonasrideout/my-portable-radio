// MusicBrainz Lookup for Album Information
class MusicBrainzLookup {
    constructor() {
        this.cache = new Map();
        this.lastRequestTime = 0;
        this.minRequestInterval = 1000; // 1 second between requests to be respectful
    }

    async lookupTrackInfo(artist, title) {
        const originalArtist = artist;
        const originalTitle = title;
        
        // Try original first, then cleaned versions
        const attempts = this.generateLookupAttempts(artist, title);
        
        for (const attempt of attempts) {
            const result = await this.tryLookup(attempt.artist, attempt.title, originalArtist, originalTitle);
            if (result) {
                console.log(`MusicBrainz success with: "${attempt.artist}" - "${attempt.title}"`);
                return result;
            }
        }
        
        console.log('MusicBrainz: All lookup attempts failed');
        return null;
    }

    generateLookupAttempts(artist, title) {
        const attempts = [];
        
        // Original version
        attempts.push({ artist, title });
        
        // Clean artist and title separately and together
        const cleanedArtist = this.cleanSearchTerm(artist);
        const cleanedTitle = this.cleanSearchTerm(title);
        
        if (cleanedArtist !== artist) {
            attempts.push({ artist: cleanedArtist, title });
        }
        
        if (cleanedTitle !== title) {
            attempts.push({ artist, title: cleanedTitle });
        }
        
        if (cleanedArtist !== artist && cleanedTitle !== title) {
            attempts.push({ artist: cleanedArtist, title: cleanedTitle });
        }
        
        return attempts;
    }

    cleanSearchTerm(term) {
        if (!term) return term;
        
        let cleaned = term;
        
        // Remove parentheses and everything inside
        cleaned = cleaned.replace(/\s*\([^)]*\)\s*/g, ' ');
        
        // Remove dash and everything after
        const dashIndex = cleaned.indexOf(' - ');
        if (dashIndex > 0) {
            cleaned = cleaned.substring(0, dashIndex);
        }
        
        // Clean up extra whitespace
        cleaned = cleaned.trim().replace(/\s+/g, ' ');
        
        return cleaned;
    }

    async tryLookup(artist, title, originalArtist, originalTitle) {
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
            const url = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&fmt=json&limit=10`;
            
            console.log('MusicBrainz lookup:', { artist, title, url });
            this.lastRequestTime = Date.now();

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const result = this.parseResponse(data, originalArtist, originalTitle);
            
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

        // Collect all releases with dates
        const releasesWithDates = [];
        
        for (const recording of data.recordings) {
            if (!recording.releases || recording.releases.length === 0) {
                continue;
            }

            for (const release of recording.releases) {
                if (release.date) {
                    const year = parseInt(release.date.substring(0, 4));
                    if (year && year >= 1900 && year <= new Date().getFullYear() + 1) {
                        releasesWithDates.push({
                            album: release.title,
                            year: year,
                            date: release.date
                        });
                    }
                }
            }
        }

        if (releasesWithDates.length === 0) {
            return null;
        }

        // Sort by year (earliest first), then by full date
        releasesWithDates.sort((a, b) => {
            if (a.year !== b.year) {
                return a.year - b.year;
            }
            return a.date.localeCompare(b.date);
        });

        const earliestRelease = releasesWithDates[0];
        
        console.log('MusicBrainz found earliest release:', {
            album: earliestRelease.album,
            year: earliestRelease.year,
            for: `${originalArtist} - ${originalTitle}`
        });

        return {
            album: earliestRelease.album,
            year: earliestRelease.year
        };
    }

    clearCache() {
        this.cache.clear();
    }
}
