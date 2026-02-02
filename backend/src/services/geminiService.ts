import { GoogleGenAI, Type } from '@google/genai';
import { CompetitorPattern } from '../types';
import { createError } from '../middleware/errorHandler';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set');
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * 競合のストーリーズスクショを分析し、パターンを抽出
 */
export const analyzeCompetitorImages = async (
  images: string[], // base64 strings (with or without data URL prefix)
  accountName: string,
  category?: string,
  focusPoint?: string
): Promise<CompetitorPattern['skeleton']> => {
  if (!images || images.length < 3) {
    throw createError('少なくとも3枚以上の画像が必要です', 400);
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

アップロードされた複数のストーリーズスクショを詳細に分析してください。

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

    const skeleton = JSON.parse(skeletonResponse.text);
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

    return response.text.trim();
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    throw createError(
      `リライト中にエラーが発生しました: ${error.message}`,
      500
    );
  }
};
