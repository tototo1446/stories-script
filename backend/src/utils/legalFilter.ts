/**
 * 薬機法・景表法に基づくNGワードフィルタリング
 * 生成された台本テキストに対して、法的に問題のある表現を検出しフラグを立てる
 */

export interface LegalWarning {
  slideId: number;
  text: string;
  matchedWord: string;
  law: '薬機法' | '景表法';
  severity: 'high' | 'medium';
  suggestion: string;
}

// 薬機法NG表現（医薬品的な効能効果を暗示する表現）
const PHARMACEUTICAL_NG_WORDS: Array<{
  pattern: RegExp;
  severity: 'high' | 'medium';
  suggestion: string;
}> = [
  // 断定的な治療・治癒表現
  { pattern: /治る|治ります|治し/g, severity: 'high', suggestion: '「調子を整える」「サポートする」等に変更' },
  { pattern: /完治/g, severity: 'high', suggestion: '使用を避けてください' },
  { pattern: /治療/g, severity: 'high', suggestion: '医薬品以外では使用不可。「ケア」「お手入れ」に変更' },
  { pattern: /万能薬|特効薬/g, severity: 'high', suggestion: '使用を避けてください' },
  { pattern: /絶対[にに]?治る|必ず治る|100%治る/g, severity: 'high', suggestion: '断定的な治癒表現は使用不可' },

  // 身体への効能効果の断定
  { pattern: /痩せる|痩せます/g, severity: 'high', suggestion: '「スッキリをサポート」「ダイエットのお供に」に変更' },
  { pattern: /シミが消え|シワが消え|シミを消す|シワを消す/g, severity: 'high', suggestion: '「目立たなくする」「ケアする」に変更' },
  { pattern: /アンチエイジング/g, severity: 'medium', suggestion: '「エイジングケア」（年齢に応じたケア）に変更' },
  { pattern: /若返[りる]/g, severity: 'high', suggestion: '「ハリ・ツヤのある肌へ」等に変更' },
  { pattern: /デトックス/g, severity: 'medium', suggestion: '「スッキリ」「リフレッシュ」に変更' },
  { pattern: /免疫力[がを]?(?:上げ|高め|アップ|強化)/g, severity: 'high', suggestion: '「健康的な毎日をサポート」に変更' },
  { pattern: /血圧[がを]?(?:下げ|下がる|低下)/g, severity: 'high', suggestion: '医薬品的表現のため使用不可' },
  { pattern: /血糖値[がを]?(?:下げ|下がる|低下)/g, severity: 'high', suggestion: '医薬品的表現のため使用不可' },

  // 医薬品的な表現
  { pattern: /処方|投与|服用/g, severity: 'high', suggestion: '「使用」「摂取」「取り入れる」に変更' },
  { pattern: /診断|診察/g, severity: 'high', suggestion: '医療行為の表現は使用不可' },
  { pattern: /医学的に証明/g, severity: 'high', suggestion: '「研究データあり」等、断定を避けた表現に' },

  // 体験談での効能効果の断定
  { pattern: /飲んだら.*?(?:治った|消えた|なくなった)/g, severity: 'medium', suggestion: '個人の感想でも効能効果の断定は避ける' },
  { pattern: /使ったら.*?(?:治った|消えた|なくなった)/g, severity: 'medium', suggestion: '個人の感想でも効能効果の断定は避ける' },
];

// 景表法NG表現（優良誤認・有利誤認を招く表現）
const MISLEADING_NG_WORDS: Array<{
  pattern: RegExp;
  severity: 'high' | 'medium';
  suggestion: string;
}> = [
  // 最上級・No.1表現（根拠なし）
  { pattern: /(?:業界|世界|日本)?No\.?1|ナンバーワン|ナンバー1/g, severity: 'high', suggestion: '根拠となる調査データの明示が必要。根拠なしは使用不可' },
  { pattern: /(?:業界|世界|日本)?最高[のな]|最高品質|最高級/g, severity: 'medium', suggestion: '根拠を明示するか「こだわりの品質」等に変更' },
  { pattern: /(?:業界|世界|日本)?初[!！]?/g, severity: 'medium', suggestion: '根拠となるデータ・出典の明示が必要' },
  { pattern: /唯一の|唯一無二/g, severity: 'medium', suggestion: '客観的な根拠がない場合は使用不可' },

  // 断定的な効果表現
  { pattern: /絶対[にに]?(?:効く|効果|おすすめ|痩せ|きれい|変わ)/g, severity: 'high', suggestion: '「絶対」を削除。個人差がある旨を付記' },
  { pattern: /必ず(?:効[くき]|変わ|実感|結果)/g, severity: 'high', suggestion: '「必ず」を削除。「※個人差があります」を付記' },
  { pattern: /100%(?:効果|満足|実感|安全)/g, severity: 'high', suggestion: '断定的な数値表現は根拠が必要' },
  { pattern: /誰でも(?:簡単に|すぐに)?(?:効果|結果|変化)/g, severity: 'medium', suggestion: '「※個人差があります」「※効果には個人差があります」を付記' },

  // 有利誤認（価格・条件）
  { pattern: /今だけ(?:無料|タダ|0円)/g, severity: 'medium', suggestion: '期間を明示する必要あり。「〜月〜日まで」を付記' },
  { pattern: /(?:通常|定価).*?(\d+).*?円.*?(?:→|が|を).*?(?:無料|0円|タダ)/g, severity: 'medium', suggestion: '二重価格表示は根拠となる販売実績が必要' },
  { pattern: /(?:半額|50%OFF|70%OFF|80%OFF|90%OFF)/g, severity: 'medium', suggestion: '割引前価格の販売実績（直近8週間等）が必要' },

  // 根拠のない比較
  { pattern: /他社(?:より|と比べて|に比べ).*?(?:優れ|上|良い|安い|高品質)/g, severity: 'high', suggestion: '比較広告は客観的データに基づく必要あり' },
  { pattern: /従来品(?:より|と比べて|に比べ).*?\d+倍/g, severity: 'medium', suggestion: '比較データの根拠を明示する必要あり' },
];

/**
 * テキストに含まれるNG表現をチェックし、警告リストを返す
 */
export const checkLegalCompliance = (
  slides: Array<{ id: number; script: string }>
): LegalWarning[] => {
  const warnings: LegalWarning[] = [];

  for (const slide of slides) {
    const text = slide.script;

    // 薬機法チェック
    for (const rule of PHARMACEUTICAL_NG_WORDS) {
      const matches = text.matchAll(rule.pattern);
      for (const match of matches) {
        warnings.push({
          slideId: slide.id,
          text: text,
          matchedWord: match[0],
          law: '薬機法',
          severity: rule.severity,
          suggestion: rule.suggestion,
        });
      }
    }

    // 景表法チェック
    for (const rule of MISLEADING_NG_WORDS) {
      const matches = text.matchAll(rule.pattern);
      for (const match of matches) {
        warnings.push({
          slideId: slide.id,
          text: text,
          matchedWord: match[0],
          law: '景表法',
          severity: rule.severity,
          suggestion: rule.suggestion,
        });
      }
    }
  }

  return warnings;
};
