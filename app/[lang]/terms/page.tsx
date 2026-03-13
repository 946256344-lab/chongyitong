import type { Metadata } from 'next';

type Props = {
  params: Promise<{ lang: 'en' | 'zh' }>;
};

const BASE_URL = 'https://severepetcondition.site';

const content = {
  zh: {
    title: '服务条款',
    lastUpdated: '最后更新：2025年1月',
    sections: [
      {
        heading: '1. 服务说明',
        body: '宠医通（以下简称"本平台"）提供宠物医疗报告解读及治疗决策辅助服务。本服务由人工专家审阅处理，旨在帮助宠物主人更好地理解兽医报告，并为与兽医的沟通提供参考依据。',
      },
      {
        heading: '2. 收费与退款',
        body: '本服务按次收费，每次服务费用为 $9.9 美元。付款成功后，若您对服务结果不满意，可在收到结果后 24 小时内申请全额退款，无需说明理由。退款申请请通过本平台提交页面联系我们，我们将在核实后尽快处理。',
      },
      {
        heading: '3. 免责声明',
        body: '本平台提供的所有内容（包括医疗报告解读、治疗路径参考及问题清单）均仅供参考，不构成专业兽医诊断、治疗建议或医疗意见。宠物的最终诊断与治疗决策须由持牌兽医做出。用户应在充分了解自身宠物情况的基础上，结合兽医的专业意见作出决策。本平台对因使用本服务内容而导致的任何直接或间接损失不承担责任。',
      },
      {
        heading: '4. 用户责任',
        body: '您在使用本服务时，应确保：（1）提交的信息（包括图片、文字描述）准确、完整且合法；（2）不上传涉及他人隐私或违法的内容；（3）将本服务内容仅用于个人参考，不得用于商业目的或转售。',
      },
      {
        heading: '5. 数据与隐私',
        body: '您提交的图片及描述信息将用于专家处理和服务提供。我们采取合理的技术措施保护您的数据安全，不会将您的个人信息出售给第三方。',
      },
      {
        heading: '6. 服务变更',
        body: '本平台保留随时修改、暂停或终止服务内容及本服务条款的权利，无需事先通知。修改后的条款将在本页面更新，继续使用本服务即视为接受修改后的条款。',
      },
      {
        heading: '7. 联系我们',
        body: '如您对本服务条款有任何疑问，欢迎通过本平台提交页面联系我们，我们将在合理时间内予以回复。',
      },
    ],
  },
  en: {
    title: 'Terms of Service',
    lastUpdated: 'Last Updated: January 2025',
    sections: [
      {
        heading: '1. Service Description',
        body: 'VetDecide AI ("the Platform") provides pet medical report interpretation and treatment decision support services. These services are reviewed and processed by human specialists to help pet owners better understand veterinary reports and prepare for informed conversations with their vets.',
      },
      {
        heading: '2. Pricing & Refund',
        body: 'This service is charged on a per-use basis at $9.9 USD per submission. If you are unsatisfied with the result, you may request a full refund within 24 hours of receiving it — no questions asked. To request a refund, please contact us through the submission page on the Platform and we will process it promptly.',
      },
      {
        heading: '3. Disclaimer',
        body: 'All content provided by this Platform — including medical report interpretations, treatment pathway references, and question checklists — is for informational purposes only. It does not constitute professional veterinary diagnosis, treatment advice, or medical opinion. Final diagnosis and treatment decisions must be made by a licensed veterinarian. The Platform is not liable for any direct or indirect losses resulting from the use of this service.',
      },
      {
        heading: '4. User Responsibilities',
        body: 'When using this service, you agree to: (1) ensure that all submitted information (including images and text descriptions) is accurate, complete, and lawful; (2) not upload content involving others\' privacy or any illegal material; (3) use the service content for personal reference only, not for commercial purposes or resale.',
      },
      {
        heading: '5. Data & Privacy',
        body: 'Images and descriptions you submit will be used to process and deliver the service. We take reasonable technical measures to protect your data and will not sell your personal information to third parties.',
      },
      {
        heading: '6. Service Changes',
        body: 'The Platform reserves the right to modify, suspend, or terminate service features and these Terms of Service at any time without prior notice. Updated terms will be published on this page. Continued use of the service constitutes acceptance of the revised terms.',
      },
      {
        heading: '7. Contact Us',
        body: 'If you have any questions about these Terms of Service, please reach out to us through the submission page on the Platform. We will respond within a reasonable timeframe.',
      },
    ],
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const c = content[lang];
  return {
    title: c.title,
    metadataBase: new URL(BASE_URL),
    alternates: {
      canonical: `/${lang}/terms`,
      languages: {
        'zh-CN': '/zh/terms',
        'en-US': '/en/terms',
      },
    },
    robots: { index: true, follow: true },
  };
}

export default async function TermsPage({ params }: Props) {
  const { lang } = await params;
  const c = content[lang];

  return (
    <div className="max-w-3xl mx-auto px-6 pt-32 pb-20">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{c.title}</h1>
      <p className="text-sm text-gray-400 mb-10">{c.lastUpdated}</p>
      <div className="space-y-8">
        {c.sections.map((section, i) => (
          <section key={i}>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">{section.heading}</h2>
            <p className="text-gray-600 leading-relaxed">{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
