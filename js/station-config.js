// Station Configuration - Isolated and easily modifiable
const STATION_CONFIG = {
    'KEXP': {
        name: 'KEXP',
        location: 'Seattle',
        stream: 'https://kexp.streamguys1.com/kexp160.aac',
        api: 'https://api.kexp.org/v2/plays/?format=json&limit=1',
        logo: 'https://static.wikia.nocookie.net/logopedia/images/b/bc/KEXP_Seattle_2018.png',
        pollInterval: 3000,
        parser: 'kexp'
    },
    'WFMU': {
        name: 'WFMU',
        location: 'New York',
        stream: 'https://stream0.wfmu.org/freeform-128k',
        api: 'https://api.allorigins.win/raw?url=https://wfmu.org/currentliveshows.php?xml=1&c=1',
        logo: 'https://wfmu.org/images/logo_bw.jpg',
        pollInterval: 4000,
        parser: 'wfmu'
    },
    'WBGO': {
        name: 'WBGO',
        location: 'Newark',
        stream: 'https://ais-sa8.cdnstream1.com/3629_128.mp3',
        api: 'https://api.composer.nprstations.org/v1/widget/5834b54de1c8aada9f4d7a9e/now?format=json&style=v2&show_song=true',
        logo: 'https://play.cdnstream1.com/zjb/image/download/2c/2f/df/2c2fdf51-d9ed-4222-babe-69a74f7633af_1400.png',
        pollInterval: 4000,
        parser: 'wbgo'
    },
    'WDVX': {
        name: 'WDVX',
        location: 'Knoxville',
        stream: 'http://wdvx.streamguys1.com/live',
        api: 'https://api.allorigins.win/raw?url=https://wdvx.streamguys1.com/status.xsl',
        logo: 'https://wdvx-radio.myshopify.com/cdn/shop/files/WDVX-No-Frequency-Logo-MAIN_1.png',
        pollInterval: 4000,
        parser: 'wdvx'
    },
    'KDHX': {
        name: 'KDHX',
        location: 'St Louis',
        stream: 'https://proxy-stream-server.onrender.com/proxy-stream/live',
        api: null,
        logo: 'https://radioinsight.com/wp-content/uploads/2025/01/kdhx.jpg',
        pollInterval: 10000,
        parser: 'none'
    },
    'WFUV': {
        name: 'WFUV',
        location: 'Bronx',
        stream: 'https://onair.wfuv.org/onair-aacplus',
        api: 'https://api.allorigins.win/raw?url=https://wfuv.org/sites/default/files/player/playlist/now_playing.json?t=',
        logo: 'https://upload.wikimedia.org/wikipedia/en/f/f7/WFUV_radio_logo.png',
        pollInterval: 4000,
        parser: 'wfuv'
    },
    'KNTU': {
        name: 'KNTU',
        location: 'North Dallas',
        stream: 'https://ice41.securenetsystems.net/KNTU?playSessionID=8BD76818-4846-410C-BE9173D6940B8BEC',
        api: 'https://streamdb4web.securenetsystems.net/player_status_update/KNTU.xml',
        logo: 'https://upload.wikimedia.org/wikipedia/en/4/4f/KNTU-logo.png',
        pollInterval: 4000,
        parser: 'kntu'
    },
    'KVRX': {
        name: 'KVRX',
        location: 'UT Austin',
        stream: 'https://streams.kut.org/5020_192.mp3',
        api: 'https://corsproxy.io/?https://kvrx.org/now_playing/track/',
        logo: 'https://kvrx.org/static/main/images/logo-yellow.png',
        pollInterval: 4000,
        parser: 'kvrx'
    },
    'WRVU': {
        name: 'WRVU',
        location: 'Nashville',
        stream: 'https://streaming.wrvu.org/live',
        api: 'https://playlists.wrvu.org/onnow/with_art/on_now_art.php',
        logo: 'https://upload.wikimedia.org/wikipedia/en/1/18/WRVU_logo.png',
        pollInterval: 3000,
        parser: 'wrvu'
    },
    'WSUM': {
        name: 'WSUM',
        location: 'Madison',
        stream: 'https://ice23.securenetsystems.net/WSUMFM',
        api: 'https://ex.wsum.org/spinitron-api/recent-track/FM',
        logo: 'https://wsum.org/wp-content/uploads/2024/05/wsum-alternate-logo-1.png',
        pollInterval: 3000,
        parser: 'wsum'
    }
};
