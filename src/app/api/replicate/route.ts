import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { image, style } = await req.json();
  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

  if (!REPLICATE_API_TOKEN) {
    return NextResponse.json({ error: 'No Replicate API token' }, { status: 500 });
  }

  // fofr/face-to-many model and актуальный version ID
  const version = 'a07f252abbbd832009640b27f063ea52d07d7a23a185ca165bec23b5acd8eaf';

  // 1. Запускаем prediction
  const predictionRes = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version,
      input: {
        image,
        style, // "3d", "emoji", "pixel-art", "video-game", "claymation", "toy"
      },
    }),
  });

  const prediction = await predictionRes.json();

  // 2. Ожидаем завершения генерации
  let output = null;
  let status = prediction.status;
  let predictionId = prediction.id;

  while (status !== 'succeeded' && status !== 'failed') {
    await new Promise(res => setTimeout(res, 2000));
    const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { 'Authorization': `Token ${REPLICATE_API_TOKEN}` },
    });
    const data = await res.json();
    status = data.status;
    output = data.output;
  }

  if (status === 'succeeded') {
    return NextResponse.json({ output });
  } else {
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 });
  }
} 