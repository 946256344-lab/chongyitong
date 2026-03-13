export default function FullDisclaimer({ lang }: { lang: string }) {
  const isZh = lang === 'zh';

  const title = isZh ? '重要声明' : 'Important Disclaimer';
  const body  = isZh ? [
    '本报告由宠医通（VetDecide AI）专家依据委托人提交的材料（包括但不限于病历、检查报告、照片及文字描述）出具，仅作信息参考之用，不构成兽医诊断、处方或治疗建议。',
    '宠物的健康状况受多种因素影响，报告结论基于委托人所提供的有限信息，专家未对动物进行直接检查。宠物的任何诊疗决定，均应由具备执业资质的兽医在充分评估后作出。',
    '本报告不得替代正规就诊，亦不得作为法律、保险或索赔依据。宠医通及出具报告的专家对因误读、错误使用本报告内容所导致的任何后果不承担责任。',
    '本报告为委托人专属文件，未经授权不得转发、复制或用于商业用途。报告有效期自出具之日起 12 个月。',
  ] : [
    'This report has been prepared by a VetDecide AI specialist based solely on materials submitted by the requesting owner (including but not limited to medical records, test reports, photographs, and written descriptions). It is provided for informational purposes only and does not constitute a veterinary diagnosis, prescription, or treatment recommendation.',
    "A pet's health is affected by many factors. The conclusions in this report are based on the limited information provided by the owner; the specialist has not directly examined the animal. All decisions regarding the pet's care and treatment must be made by a licensed veterinarian following a thorough evaluation.",
    'This report may not substitute for a formal veterinary consultation, nor may it be used as the basis for any legal, insurance, or claims proceedings. VetDecide AI and the specialist who prepared this report accept no liability for consequences arising from misinterpretation or misuse of the contents.',
    'This report is issued exclusively for the requesting owner. Unauthorized forwarding, reproduction, or commercial use is prohibited. This report is valid for 12 months from the date of issue.',
  ];

  const copyright = isZh ? '© VetDecide AI · 保留所有权利' : '© VetDecide AI · All rights reserved';

  return (
    <div className="mt-12 pt-8 border-t" style={{ borderColor: '#e2e8f0' }}>
      <h2 className="text-base font-bold mb-4" style={{ color: '#1E3A5F' }}>
        {title}
      </h2>
      <div className="space-y-3">
        {body.map((para, i) => (
          <p key={i} className="text-xs text-gray-500 leading-6">{para}</p>
        ))}
      </div>
      <p className="mt-6 text-xs text-gray-400">{copyright}</p>
    </div>
  );
}
