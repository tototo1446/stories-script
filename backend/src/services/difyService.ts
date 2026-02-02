import { Brand, CompetitorPattern, StorySlide } from '../types';
import { createError } from '../middleware/errorHandler';

if (!process.env.DIFY_API_KEY || !process.env.DIFY_BASE_URL) {
  throw new Error('Dify API configuration is missing');
}

const DIFY_API_KEY = process.env.DIFY_API_KEY;
const DIFY_BASE_URL = process.env.DIFY_BASE_URL;
const WORKFLOW_ID = process.env.DIFY_WORKFLOW_ID;

/**
 * Difyワークフローを呼び出して台本を生成
 */
export const generateScriptWithDify = async (
  brand: Brand,
  pattern: CompetitorPattern,
  topic: string,
  vibe: string
): Promise<StorySlide[]> => {
  if (!WORKFLOW_ID) {
    throw createError('DifyワークフローIDが設定されていません', 500);
  }

  try {
    // Dify APIのワークフロー実行エンドポイント
    const url = `${DIFY_BASE_URL}/workflows/run`;

    // リクエストボディの準備
    const requestBody = {
      inputs: {
        brand_info: {
          name: brand.name,
          product_description: brand.product_description,
          target_audience: brand.target_audience,
          brand_tone: brand.brand_tone
        },
        pattern: {
          name: pattern.name,
          description: pattern.description,
          skeleton: pattern.skeleton
        },
        topic,
        vibe
      },
      response_mode: 'blocking', // 同期実行
      user: 'storyflow-api' // ユーザー識別子
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DIFY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Dify API Error:', errorText);
      throw createError(
        `Dify API呼び出しに失敗しました: ${response.status} ${response.statusText}`,
        500
      );
    }

    const result = await response.json();

    // Difyのレスポンスから台本データを抽出
    // レスポンス構造はDifyワークフローの出力に依存
    if (result.data && result.data.outputs) {
      const outputs = result.data.outputs;
      
      // ワークフローの出力変数名に応じて調整が必要
      // 一般的には、ワークフローの終了ノードの出力変数名を使用
      let slides: StorySlide[] = [];

      // 複数の出力形式に対応
      if (outputs.slides && Array.isArray(outputs.slides)) {
        slides = outputs.slides;
      } else if (outputs.script && Array.isArray(outputs.script)) {
        slides = outputs.script;
      } else if (outputs.result && Array.isArray(outputs.result)) {
        slides = outputs.result;
      } else if (typeof outputs === 'string') {
        // JSON文字列の場合
        try {
          const parsed = JSON.parse(outputs);
          slides = Array.isArray(parsed) ? parsed : parsed.slides || [];
        } catch {
          throw createError('Difyからのレスポンス形式が不正です', 500);
        }
      } else {
        throw createError('Difyからのレスポンスに台本データが含まれていません', 500);
      }

      // StorySlide形式に変換
      return slides.map((slide: any, index: number) => ({
        id: slide.id || index + 1,
        role: slide.role || slide.purpose || '',
        visualGuidance: slide.visualGuidance || slide.visual_instruction || '',
        script: slide.script || slide.text || '',
        tips: slide.tips || slide.tip || ''
      }));
    } else {
      throw createError('Difyからのレスポンス形式が不正です', 500);
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }
    console.error('Dify Service Error:', error);
    throw createError(
      `台本生成に失敗しました: ${error.message}`,
      500
    );
  }
};

/**
 * Difyワークフローのステータスを確認（非同期実行の場合）
 */
export const checkWorkflowStatus = async (taskId: string): Promise<any> => {
  const url = `${DIFY_BASE_URL}/tasks/${taskId}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${DIFY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw createError(
        `ステータス確認に失敗しました: ${response.status}`,
        500
      );
    }

    return await response.json();
  } catch (error: any) {
    console.error('Dify Status Check Error:', error);
    throw createError(
      `ステータス確認に失敗しました: ${error.message}`,
      500
    );
  }
};
