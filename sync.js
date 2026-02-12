import fetch from "node-fetch";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = process.env.CHANNEL_ID;
const WIX_API_KEY = process.env.WIX_API_KEY;
const WIX_SITE_ID = process.env.WIX_SITE_ID;

const SHOW_KEYWORDS = [
  { keyword: "Baseball", showId: "SHOW_ID_1" },
  { keyword: "Football", showId: "SHOW_ID_2" }
];

async function fetchRecentVideos() {
  const publishedAfter = new Date(Date.now() - 24*60*60*1000).toISOString();

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&order=date&type=video&publishedAfter=${publishedAfter}&key=${YOUTUBE_API_KEY}`;

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
        thumbnail: snippet.thumbnails.high.url,
        publishedAt: snippet.publishedAt,
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

  for (const video of videos) {
    const videoId = video.id.videoId;
    const title = video.snippet.title;

    if (await videoExists(videoId)) continue;

    const showId = matchShow(title);
    if (!showId) continue;

    await insertVideo(video, showId);
  }
}

main();
