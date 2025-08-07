// Track Information Parser - Enhanced to extract year and more metadata
class TrackParser {
    static parseTrackInfo(stationId, data) {
        const station = STATION_CONFIG[stationId];
        if (!station) return null;

        const parser = this.parsers[station.parser];
        if (!parser) return this.createFallbackTrack(stationId);

        try {
            return parser(data, stationId);
        } catch (error) {
            console.error(`Parser error for ${stationId}:`, error);
            return this.createFallbackTrack(stationId);
        }
    }

    static createFallbackTrack(stationId) {
        return {
            artist: 'Unknown Artist',
            title: 'Unknown Track',
            album: null,
            year: null,
            station: stationId,
            displayText: `Listening to ${stationId}`,
            raw: null
        };
    }

    static extractYear(text) {
        if (!text) return null;
        
        // Look for 4-digit years (1900-2099)
        const yearMatch = text.match(/\b(19\d{2}|20\d{2})\b/);
        return yearMatch ? parseInt(yearMatch[1]) : null;
    }

    static cleanText(text) {
        if (!text) return '';
        return text.trim()
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");
    }

    static parsers = {
        kexp: (data, stationId) => {
            if (data.results && data.results.length > 0) {
                const track = data.results[0];
                const artist = track.artist || 'Unknown Artist';
                const title = track.song || 'Unknown Track';
                const album = track.album || null;
                
                // Extract year from release_date if available
                let year = null;
                if (track.release_date) {
                    year = TrackParser.extractYear(track.release_date);
                }

                return {
                    artist,
                    title,
                    album,
                    year,
                    station: stationId,
                    displayText: `${artist} - ${title}`,
                    raw: track
                };
            }
            return TrackParser.createFallbackTrack(stationId);
        },

        wbgo: (data, stationId) => {
            if (data.onNow && data.onNow.song) {
                const song = data.onNow.song;
                const artist = song.artistName || 'Unknown Artist';
                const title = song.trackName || 'Unknown Track';
                const album = song.albumName || null;
                const year = TrackParser.extractYear(album) || TrackParser.extractYear(song.catalogNumber);

                return {
                    artist,
                    title,
                    album,
                    year,
                    station: stationId,
                    displayText: `${artist} - ${title}${year ? ` (${year})` : ''}`,
                    raw: song
                };
            }
            return TrackParser.createFallbackTrack(stationId);
        },

        wfuv: (data, stationId) => {
            if (data.live) {
                const live = data.live;
                const artist = live.artist || live.artistName || 'Unknown Artist';
                const title = live.title || live.songName || 'Unknown Track';
                const album = live.album || null;
                const year = TrackParser.extractYear(live.year) || TrackParser.extractYear(album);

                return {
                    artist,
                    title,
                    album,
                    year,
                    station: stationId,
                    displayText: `${artist} - ${title}${year ? ` (${year})` : ''}`,
                    raw: live
                };
            }
            return TrackParser.createFallbackTrack(stationId);
        },

        wfmu: (data, stationId) => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data, 'text/xml');
            
            // Try to get the real recording artist and title from the song field
            const songEl = xmlDoc.querySelector('song');
            let artist = 'Unknown Artist';
            let title = 'Unknown Track';
            
            if (songEl) {
                const songText = TrackParser.cleanText(songEl.textContent);
                console.log('WFMU song field:', songText);
                
                // Parse format: "Song Title" by Artist Name
                const byMatch = songText.match(/^"([^"]+)"\s+by\s+(.+)$/);
                if (byMatch) {
                    title = byMatch[1].trim();
                    artist = byMatch[2].trim();
                    console.log('WFMU extracted from song field:', { artist, title });
                } else {
                    // Fallback to separate artist/title fields if song parsing fails
                    const artistEl = xmlDoc.querySelector('artist');
                    const titleEl = xmlDoc.querySelector('title');
                    
                    if (artistEl && titleEl) {
                        artist = TrackParser.cleanText(artistEl.textContent);
                        title = TrackParser.cleanText(titleEl.textContent);
                        console.log('WFMU using fallback artist/title fields:', { artist, title });
                    }
                }
            }
            
            // Get album info
            const albumEl = xmlDoc.querySelector('album');
            const album = albumEl ? TrackParser.cleanText(albumEl.textContent) : null;
            
            // Extract year from album name if present
            const year = TrackParser.extractYear(album);

            if (artist !== 'Unknown Artist' && title !== 'Unknown Track') {
                return {
                    artist,
                    title,
                    album,
                    year,
                    station: stationId,
                    displayText: `${artist} - ${title}${year ? ` (${year})` : ''}`,
                    raw: { artist, title, album, year, originalSong: songEl ? songEl.textContent : null }
                };
            }

            return TrackParser.createFallbackTrack(stationId);
        },

        kntu: (data, stationId) => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data, 'text/xml');
            
            const artistEl = xmlDoc.querySelector('artist');
            const titleEl = xmlDoc.querySelector('title');
            const albumEl = xmlDoc.querySelector('album');

            if (artistEl && titleEl) {
                const artist = TrackParser.cleanText(artistEl.textContent);
                const title = TrackParser.cleanText(titleEl.textContent);
                const album = albumEl ? TrackParser.cleanText(albumEl.textContent) : null;
                const year = TrackParser.extractYear(album);

                return {
                    artist,
                    title,
                    album,
                    year,
                    station: stationId,
                    displayText: `${artist} - ${title}${year ? ` (${year})` : ''}`,
                    raw: { artist, title, album }
                };
            }

            return TrackParser.createFallbackTrack(stationId);
        },

        wdvx: (data, stationId) => {
            console.log('WDVX raw data:', data); // Debug logging
            
            // Try multiple patterns to find track info
            const patterns = [
                // WDVX-specific pattern for "Current Song:" table format
                /<td>Current Song:<\/td>\s*<td[^>]*>([^<]+)<\/td>/i,
                // XML-style patterns for Icecast status
                /<title[^>]*>([^<]+)<\/title>/i,
                /<server_name[^>]*>([^<]+)<\/server_name>/i,
                /<yp_currently_playing[^>]*>([^<]+)<\/yp_currently_playing>/i,
                /<artist[^>]*>([^<]+)<\/artist>/i,
                /<song[^>]*>([^<]+)<\/song>/i,
                // HTML table patterns - look for streamdata class specifically
                /<td class="streamdata">([^<]+)<\/td>/i,
                // General HTML table patterns
                /<td[^>]*>([^<]*\s*-\s*[^<]*)<\/td>/i,
                // Text-based patterns
                /current[^<]*song[^<]*:?\s*([^<\n\r]+)/i,
                /now playing[^<]*:?\s*([^<\n\r]+)/i,
                /title[^<]*:?\s*([^<\n\r]+)/i,
                // StreamGuys-specific patterns
                /StreamTitle='([^']+)'/i,
                /Current Track:\s*([^\n\r]+)/i,
                // Last resort - any text that looks like "Artist - Title"
                /([^<>\n\r]+ - [^<>\n\r]+)/
            ];

            let songText = null;
            
            for (const pattern of patterns) {
                const match = data.match(pattern);
                if (match && match[1] && match[1].trim()) {
                    songText = TrackParser.cleanText(match[1].trim());
                    console.log('WDVX matched pattern:', pattern, 'result:', songText);
                    
                    // Skip if it's just the station name or generic text
                    if (songText.toLowerCase().includes('wdvx') && !songText.includes(' - ')) {
                        continue;
                    }
                    
                    break;
                }
            }

            if (songText) {
                const dashIndex = songText.indexOf(' - ');
                
                if (dashIndex > 0) {
                    const artist = songText.substring(0, dashIndex).trim();
                    const titlePart = songText.substring(dashIndex + 3).trim();
                    const year = TrackParser.extractYear(titlePart);
                    let title = titlePart.replace(/\s*\(\d{4}\)\s*/, '').trim();

                    // Handle duplicate titles like "Song Name - Song Name"
                    const titleDashIndex = title.indexOf(' - ');
                    if (titleDashIndex > 0) {
                        const firstPart = title.substring(0, titleDashIndex).trim();
                        const secondPart = title.substring(titleDashIndex + 3).trim();
                        // If both parts are the same, use just one
                        if (firstPart === secondPart) {
                            title = firstPart;
                            console.log('WDVX removed duplicate title:', { original: titlePart, cleaned: title });
                        }
                    }

                    // Make sure we have meaningful data
                    if (artist && title && artist !== title) {
                        return {
                            artist,
                            title,
                            album: null,
                            year,
                            station: stationId,
                            displayText: `${artist} - ${title}${year ? ` (${year})` : ''}`,
                            raw: { songText, matchedData: data.substring(0, 500) }
                        };
                    }
                } else if (songText.length > 3) {
                    // Even if no dash, use as title if it's meaningful
                    return {
                        artist: 'Unknown Artist',
                        title: songText,
                        album: null,
                        year: TrackParser.extractYear(songText),
                        station: stationId,
                        displayText: `Unknown Artist - ${songText}`,
                        raw: { songText, matchedData: data.substring(0, 500) }
                    };
                }
            }

            console.log('WDVX: No valid track info found');
            return TrackParser.createFallbackTrack(stationId);
        },

        kvrx: (data, stationId) => {
            console.log('KVRX parser received data:', data, 'type:', typeof data);
            
            if (data && data.artist && data.track) {
                let artist = data.artist || 'Unknown Artist';
                let title = data.track || 'Unknown Track';
                let album = data.album || null;
                let year = null;
                
                // Check if album info is embedded in the track title (format: "Song - Album")
                if (!album && title.includes(' - ')) {
                    const dashIndex = title.indexOf(' - ');
                    const potentialAlbum = title.substring(dashIndex + 3).trim();
                    
                    // Only extract if the part after dash looks like an album (not too short)
                    if (potentialAlbum.length > 2 && !potentialAlbum.match(/^(remix|extended|radio|edit|version)$/i)) {
                        album = potentialAlbum;
                        title = title.substring(0, dashIndex).trim();
                        console.log('KVRX extracted album from title:', { title, album });
                    }
                }
                
                // Try to extract year from album name if available
                if (album) {
                    year = TrackParser.extractYear(album);
                }

                // Create display text without show information
                let displayText = `${artist} - ${title}`;
                if (year) {
                    displayText += ` (${year})`;
                }

                const result = {
                    artist,
                    title,
                    album,
                    year,
                    station: stationId,
                    displayText,
                    raw: data
                };
                
                console.log('KVRX parser returning:', result);
                return result;
            }
            
            console.log('KVRX parser: no valid data found, using fallback');
            return TrackParser.createFallbackTrack(stationId);
        },
        wrvu: (data, stationId) => {
            console.log('WRVU parser received data:', data, 'type:', typeof data);
            
            // Handle case where JSON is returned as string
            let parsedData = data;
            if (typeof data === 'string') {
                try {
                    parsedData = JSON.parse(data);
                    console.log('WRVU parsed JSON successfully:', parsedData);
                } catch (e) {
                    console.log('WRVU JSON parse failed:', e);
                    return TrackParser.createFallbackTrack(stationId);
                }
            }
            
            if (parsedData && parsedData.artist && parsedData.song) {
                const artist = parsedData.artist || 'Unknown Artist';
                const title = parsedData.song || 'Unknown Track';
                const album = parsedData.album || null;
                
                // WRVU doesn't seem to provide year in API, extract from album if present
                const year = TrackParser.extractYear(album);

                const result = {
                    artist,
                    title,
                    album,
                    year,
                    station: stationId,
                    displayText: `${artist} - ${title}${year ? ` (${year})` : ''}`,
                    raw: parsedData
                };
                
                console.log('WRVU parser returning:', result);
                return result;
            }
            
            console.log('WRVU parser: no valid data found, using fallback');
            return TrackParser.createFallbackTrack(stationId);
        },
        none: (data, stationId) => {
            return {
                artist: 'Live Radio',
                title: 'Track Data Not Available',
                album: null,
                year: null,
                station: stationId,
                displayText: 'Track Data Not Available',
                raw: null
            };
        }
    };
}
