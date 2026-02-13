console.log("Script started");

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = process.env.CHANNEL_ID;
const WIX_API_KEY = process.env.WIX_API_KEY;
const WIX_SITE_ID = process.env.WIX_SITE_ID;

const SHOW_KEYWORDS = [
  { keyword: "The Insiders Show", showId: "14ef63df-3b78-4cee-a3d7-da89fc7fc871" },
  { keyword: "The Riedell Report", showId: "d92e36f3-7256-4148-99d1-885ac3b7c9b6" }
];

async function fetchRecentVideos() {
  const publishedAfter = new Date(Date.now() - 24*60*60*1000).toISOString();

const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&order=date&type=video&maxResults=5&key=${YOUTUBE_API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  return data.items || [];
}

function matchShow(title) {
  for (const show of SHOW_KEYWORDS) {
    if (title.toLowerCase().includes(show.keyword.toLowerCase())) {
      return show.showId;
    }
  }
  return null;
}

async function videoExists(videoId) {
  const query = {
    query: {
      filter: {
        youtubeVideoId: { $eq: videoId }
      }
    }
  };

  const res = await fetch(
    `https://www.wixapis.com/data/v2/items/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": WIX_API_KEY,
        "wix-site-id": WIX_SITE_ID
      },
      body: JSON.stringify({
        dataCollectionId: "YouTubeVideos",
        query: query.query
      })
    }
  );

  const data = await res.json();
  return data.dataItems.length > 0;
}

async function insertVideo(video, showId) {
  const videoId = video.id.videoId;
  const snippet = video.snippet;

  const body = {
    dataCollectionId: "YouTubeVideos",
    dataItem: {
      data: {
        title: snippet.title,
        youtubeVideoId: videoId,
        videoUrl: `https://youtube.com/watch?v=${videoId}`,
        publishedAt: snippet.publishedAt,
        isActive: true,

        // Image field must be object
        thumbnail: {
          url: snippet.thumbnails.high.url
        },

        // Reference field must be the _id of the show
        show: showId
      }
    }
  };

  await fetch(`https://www.wixapis.com/data/v2/items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": WIX_API_KEY,
      "wix-site-id": WIX_SITE_ID
    },
    body: JSON.stringify(body)
  });

  console.log("Inserted:", snippet.title);
}


async function main() {
  const videos = await fetchRecentVideos();

  console.log("Videos returned from YouTube:", videos.length);

  for (const video of videos) {
    const videoId = video.id.videoId;
    const title = video.snippet.title;

    console.log("Checking:", title);

    const exists = await videoExists(videoId);
    console.log("Already exists?", exists);

    if (exists) continue;

    const showId = matchShow(title);
    console.log("Matched show ID:", showId);

    if (!showId) {
      console.log("No matching show keyword found.");
      continue;
    }

    await insertVideo(video, showId);
  }
  async function main() {
  console.log("Inside main()");
}

main();
