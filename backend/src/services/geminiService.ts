import { GoogleGenAI, Type } from '@google/genai';
import { Brand, CompetitorPattern, StorySlide } from '../types';
import { createError } from '../middleware/errorHandler';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set');
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Instagramストーリーズの基礎知識プリセット
 * 分析・生成の両方で共通利用
 */
const STORIES_KNOWLEDGE_PRESET = `## Instagramストーリーズ基礎知識

### フォーマット仕様
- 縦型フルスクリーン（9:16 / 1080×1920px）
- 1枚あたりの表示時間: 静止画5秒、動画最大60秒
- 24時間で自動消滅（ハイライトに保存可能）
- テキストは上下15%のセーフゾーンを避けて配置（UIと被るため）

### 効果的な構成パターン
- 最適枚数: 3〜7枚（離脱率を考慮。7枚以上は完走率が大幅低下）
- 1枚目（フック）: 最重要。数字・疑問文・意外性で「次を見たい」を作る
- 中盤（共感→教育）: 視聴者の悩みに寄り添い、解決の糸口を見せる
- 最終枚（CTA）: 明確な行動喚起。「DMで◯◯と送って」「リンクはここ」「保存してね」

### エンゲージメント向上テクニック
- インタラクティブ要素: アンケート、クイズ、質問BOX、スライダーで反応率2〜3倍
- テキスト量: 1枚あたり40文字以内が理想。多くても60文字まで
- フォント: 読みやすさ優先。背景と同系色のフォントは避ける
- GIFスタンプ: 「NEW」「TAP」等で視線誘導
- メンションとハッシュタグ: ストーリーズでは1〜2個が最適（多すぎると逆効果）

### 投稿タイミング
- 通勤時間帯（7:00-9:00）、昼休み（12:00-13:00）、夜のリラックスタイム（20:00-22:00）が高反応
- 複数枚を一度に投稿するより、時間を空けて投稿する方がリーチが伸びやすい

### やってはいけないこと
- 文字だらけの画面（1枚に情報を詰め込みすぎ）
- 冒頭でオチが見えるネタバレ構成
- CTAなしで終わる（「で、何すればいいの？」状態）
- 音声なし前提のテキスト設計を怠る（85%はミュートで視聴）`;

/**
 * 競合のストーリーズスクショを分析し、パターンを抽出
 */
export const analyzeCompetitorImages = async (
  images: string[], // base64 strings (with or without data URL prefix)
  accountName: string,
  category?: string,
  focusPoint?: string
): Promise<CompetitorPattern['skeleton']> => {
  if (!images || images.length < 5) {
    throw createError('少なくとも5枚以上の画像が必要です', 400);
  }

  const model = 'gemini-2.0-flash-exp';

  // Convert base64 images to inline data format
  const imageParts = images.map(img => {
    const base64Data = img.includes(',') ? img.split(',')[1] : img;
    return {
      inlineData: {
        data: base64Data,
        mimeType: 'image/jpeg'
      }
    };
  });

  try {
    // Step 1: 詳細な画像分析
    const analysisPrompt = `あなたはInstagramストーリーズのマーケティング分析専門家です。

以下のストーリーズの基礎知識を踏まえた上で、アップロードされた複数のストーリーズスクショを詳細に分析してください。

## 前提知識
- ストーリーズは縦型フルスクリーン（9:16）、静止画5秒/動画最大60秒、24時間で消滅
- 最適枚数は3〜7枚（7枚以上は完走率が大幅低下）
- 1枚あたりのテキストは40文字以内が理想、上下15%はセーフゾーン
- 85%のユーザーはミュートで視聴するため、テキスト設計が重要
- インタラクティブ要素（アンケート、クイズ等）で反応率2〜3倍

## 分析項目

1. **各枚の役割**: 1枚目から順に、各スライドの目的・役割を特定
2. **コピーライティング**: 使われているフック、キャッチコピー、CTA
3. **レイアウト・デザイン**: 文字の配置、背景、装飾、色使い
4. **マーケティング意図**: なぜこの順番・構成なのか、心理的効果
5. **エンゲージメント要素**: 投票、質問、スワイプアップ等の活用

## 出力形式

各スライドを「1枚目」「2枚目」...と明確に区分して分析してください。

アカウント: ${accountName}
業種: ${category || '未指定'}
着眼点: ${focusPoint || 'なし'}`;

    const analysisResponse = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          ...imageParts,
          { text: analysisPrompt }
        ]
      },
      config: {
        temperature: 0.3
      }
    });

    const analysisText = analysisResponse.text;

    // Step 2: スケルトン抽出
    const skeletonPrompt = `あなたはInstagramストーリーズの構成パターン（スケルトン）を抽出する専門家です。

前段の分析結果を元に、再現可能な「型」としてテンプレート化してください。

## スケルトンの構造

各スライドについて以下を定義：
- **役割**: このスライドの目的（例：数字で引く、共感させる、解決策を出す、CTAを促す）
- **推奨要素**: 入れるべき要素（例：Before/After、数字、質問、矢印）
- **コピー型**: 文章の型（例：「〇〇で悩んでない？」「実は△△するだけで...」）
- **撮影/素材指示**: 背景、見せ方のアドバイス

## 出力形式

JSON形式で構造化して出力してください。

以下の分析結果から「${accountName}さん風テンプレート」を抽出してください。

=== 分析結果 ===
${analysisText}`;

    const skeletonResponse = await ai.models.generateContent({
      model,
      contents: skeletonPrompt,
      config: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            template_name: {
              type: Type.STRING,
              description: 'テンプレート名（〇〇さん風）'
            },
            category: {
              type: Type.STRING,
              description: '業種・カテゴリ'
            },
            total_slides: {
              type: Type.NUMBER,
              description: '推奨スライド枚数'
            },
            skeleton: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  slide_number: { type: Type.NUMBER },
                  role: {
                    type: Type.STRING,
                    description: 'スライドの役割'
                  },
                  recommended_elements: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  copy_pattern: {
                    type: Type.STRING,
                    description: 'コピーの型（穴埋め形式）'
                  },
                  visual_instruction: {
                    type: Type.STRING,
                    description: '撮影・素材の指示'
                  }
                },
                required: [
                  'slide_number',
                  'role',
                  'recommended_elements',
                  'copy_pattern',
                  'visual_instruction'
                ]
              }
            },
            summary: {
              type: Type.OBJECT,
              properties: {
                best_for: {
                  type: Type.STRING,
                  description: 'この型が適している商材・シーン'
                },
                key_success_factors: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              }
            }
          },
          required: [
            'template_name',
            'category',
            'total_slides',
            'skeleton',
            'summary'
          ]
        }
      }
    });

    const skeleton = JSON.parse(skeletonResponse.text ?? '{}');
    return skeleton;
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    throw createError(
      `画像分析中にエラーが発生しました: ${error.message}`,
      500
    );
  }
};

/**
 * 台本テキストをリライト
 */
export const rewriteScript = async (
  originalText: string,
  instruction: string
): Promise<string> => {
  if (!originalText || !instruction) {
    throw createError('元のテキストとリライト指示が必要です', 400);
  }

  const model = 'gemini-2.0-flash-exp';

  const prompt = `以下の台本テキストを、ユーザーの指示に従ってリライトしてください。

【元のテキスト】
${originalText}

【リライト指示】
${instruction}

リライト後のテキストのみを返してください。説明や補足は不要です。`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        temperature: 0.7
      }
    });

    return (response.text ?? '').trim();
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    throw createError(
      `リライト中にエラーが発生しました: ${error.message}`,
      500
    );
  }
};

/**
 * Gemini APIで直接台本を生成
 * 「保存された型」×「自社データ」×「今日のトピック」を統合
 */
export const generateScript = async (
  brand: Brand,
  pattern: CompetitorPattern,
  topic: string,
  vibe: string,
  userPreferences?: string
): Promise<StorySlide[]> => {
  const model = 'gemini-2.0-flash-exp';

  const skeletonStr = pattern.skeleton.slides
    .map((s: { slide_number: number; role: string; copy_pattern: string; visual_instruction: string; recommended_elements: string[] }) =>
      `  Slide ${s.slide_number}: 役割「${s.role}」/ コピー型「${s.copy_pattern}」/ 撮影指示「${s.visual_instruction}」/ 推奨要素: ${s.recommended_elements.join(', ')}`)
    .join('\n');

  const prompt = `あなたはInstagramストーリーズ台本の専門コピーライターです。

${STORIES_KNOWLEDGE_PRESET}

---

## あなたのタスク

以下の3つの情報を掛け合わせて、撮影現場でそのまま使えるストーリーズ台本を生成してください。

### 1. ブランド情報
- ブランド名: ${brand.name}
- 商品説明: ${brand.product_description}
- ターゲット: ${brand.target_audience}
- ブランドトーン: ${brand.brand_tone}

### 2. 適用する構成パターン（型）
テンプレート名: ${pattern.name}
${skeletonStr}

### 3. 今日のトピック
${topic}

### 4. 今日のバイブス（雰囲気）
${vibe}
${userPreferences ? `
### 5. ユーザーの好み・修正傾向（過去の成長ログから学習済み）
以下はこのユーザーが過去にAI生成台本を手動修正した傾向です。この好みを反映して生成してください。
${userPreferences}
` : ''}
---

## 出力ルール
- 各スライドの「script」は実際にストーリーズに載せるコピー文をそのまま書く（40文字以内推奨）
- 「visualGuidance」は撮影者への具体的な指示（背景、構図、使用素材）
- 「tips」はマーケティング的な補足アドバイス（1文）
- 「role」はそのスライドの構成上の役割
- 薬機法・景表法に抵触する断定的表現（「絶対治る」「No.1」等）は避ける
- ブランドトーンと今日のバイブスを反映した文体にする`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        temperature: 0.8,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: {
                type: Type.NUMBER,
                description: 'スライド番号（1始まり）'
              },
              role: {
                type: Type.STRING,
                description: 'スライドの役割（例: フック、共感、解決策、CTA）'
              },
              visualGuidance: {
                type: Type.STRING,
                description: '撮影・素材の具体的指示'
              },
              script: {
                type: Type.STRING,
                description: 'ストーリーズに載せるコピー文'
              },
              tips: {
                type: Type.STRING,
                description: 'マーケティング補足アドバイス'
              }
            },
            required: ['id', 'role', 'visualGuidance', 'script', 'tips']
          }
        }
      }
    });

    const slides: StorySlide[] = JSON.parse(response.text ?? '[]');
    return slides;
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    throw createError(
      `台本生成中にエラーが発生しました: ${error.message}`,
      500
    );
  }
};
