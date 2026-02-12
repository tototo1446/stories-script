import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from '../../_lib/cors';
import { supabase } from '../../_lib/supabase';
import { rewriteScript } from '../../_lib/geminiService';
import { checkLegalCompliance } from '../../_lib/legalFilter';
import type { StorySlide } from '../../_lib/types';

export const config = {
  maxDuration: 30,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const { slide_id, instruction } = req.body;

    if (!slide_id || !instruction) {
      return res.status(400).json({ status: 'error', message: 'slide_id と instruction は必須です' });
    }

    const { data: script, error: scriptError } = await supabase
      .from('generated_scripts')
      .select('*')
      .eq('id', id as string)
      .single();

    if (scriptError || !script) {
      return res.status(404).json({ status: 'error', message: '台本が見つかりません' });
    }

    const slides: StorySlide[] = script.slides;
    const slide = slides.find(s => s.id === slide_id);

    if (!slide) {
      return res.status(404).json({ status: 'error', message: '指定されたスライドが見つかりません' });
    }

    const originalText = slide.script;
    const rewrittenText = await rewriteScript(originalText, instruction);

    slide.script = rewrittenText;
    const updatedSlides = slides.map(s => s.id === slide_id ? slide : s);

    const { data: updatedScript, error: updateError } = await supabase
      .from('generated_scripts')
      .update({ slides: updatedSlides })
      .eq('id', id as string)
      .select()
      .single();

    if (updateError) throw updateError;

    await supabase.from('script_rewrites').insert({
      script_id: id,
      slide_id,
      original_text: originalText,
      rewritten_text: rewrittenText,
      instruction
    });

    const legalWarnings = checkLegalCompliance([slide]);

    return res.json({
      status: 'success',
      data: {
        slide,
        script: updatedScript,
        legal_warnings: legalWarnings
      }
    });
  } catch (error: any) {
    console.error('Rewrite error:', error);
    return res.status(500).json({ status: 'error', message: `リライトに失敗しました: ${error.message}` });
  }
}
