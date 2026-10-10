import type { Locale } from './i18n/config'

// Starting texts. Fill in the bracketed company details once Royeel is
// registered, and have them reviewed before launch.
type Doc = { title: string; sections: { heading: string; body: string[] }[] }

const legal: Record<'conditions' | 'exchanges' | 'privacy', Record<Locale, Doc>> = {
  conditions: {
    fr: {
      title: 'Conditions générales de vente',
      sections: [
        {
          heading: 'Vendeur',
          body: [
            'Royeel — [raison sociale], [adresse], RC [numéro], ICE [numéro]. Contact : par WhatsApp ou e-mail depuis le site.',
          ],
        },
        {
          heading: 'Commandes',
          body: [
            'La commande est passée sur le site en indiquant vos coordonnées, la taille et le mode de paiement. Nous pouvons vous appeler pour la confirmer avant l’expédition. Une commande qui ne peut pas être confirmée peut être annulée.',
          ],
        },
        {
          heading: 'Prix et paiement',
          body: [
            'Les prix sont indiqués en dirhams marocains (MAD), toutes taxes comprises. Le paiement se fait à la livraison, par virement bancaire ou par carte bancaire (lorsque disponible).',
          ],
        },
        {
          heading: 'Livraison',
          body: [
            'La livraison est offerte partout au Maroc. Les délais sont donnés à titre indicatif et dépendent de la ville de livraison.',
          ],
        },
        {
          heading: 'Échanges',
          body: ['Voir notre politique d’échange : l’échange de taille se fait uniquement à la livraison, en présence du livreur.'],
        },
      ],
    },
    ar: {
      title: 'الشروط العامة للبيع',
      sections: [
        {
          heading: 'البائع',
          body: ['Royeel — [الاسم التجاري]، [العنوان]، السجل التجاري [الرقم]، ICE [الرقم]. للتواصل: عبر واتساب أو البريد الإلكتروني من الموقع.'],
        },
        {
          heading: 'الطلبات',
          body: [
            'يتم الطلب عبر الموقع بإدخال معلوماتك والمقاس وطريقة الدفع. قد نتصل بك لتأكيد الطلب قبل الإرسال، ويمكن إلغاء الطلب الذي يتعذّر تأكيده.',
          ],
        },
        {
          heading: 'الأسعار والدفع',
          body: [
            'الأسعار معروضة بالدرهم المغربي وتشمل جميع الضرائب. يتم الدفع عند الاستلام أو بالتحويل البنكي أو بالبطاقة البنكية (عند توفرها).',
          ],
        },
        {
          heading: 'التوصيل',
          body: ['التوصيل مجاني لجميع مدن المغرب. آجال التوصيل تقريبية وتختلف حسب المدينة.'],
        },
        {
          heading: 'الاستبدال',
          body: ['راجعي سياسة الاستبدال: يتم استبدال المقاس فقط عند الاستلام، بحضور عامل التوصيل.'],
        },
      ],
    },
  },
  exchanges: {
    fr: {
      title: 'Politique d’échange',
      sections: [
        {
          heading: 'Échange uniquement à la livraison',
          body: [
            'L’échange de taille se fait uniquement au moment de la livraison : essayez votre manteau en présence du livreur.',
            'Une fois la livraison terminée et le livreur parti, aucun échange n’est possible.',
          ],
        },
        {
          heading: 'Comment faire ?',
          body: [
            'Si la taille ne vous convient pas, rendez le manteau au livreur, dans son état d’origine et avec ses étiquettes, et écrivez-nous sur WhatsApp avec votre numéro de commande et la taille souhaitée. Nous vous envoyons une autre taille, selon les disponibilités.',
          ],
        },
        {
          heading: 'Remboursement',
          body: ['Les articles ne sont pas remboursés ; seul l’échange de taille est proposé.'],
        },
      ],
    },
    ar: {
      title: 'سياسة الاستبدال',
      sections: [
        {
          heading: 'الاستبدال عند الاستلام فقط',
          body: [
            'يتم استبدال المقاس فقط عند الاستلام: جرّبي المعطف بحضور عامل التوصيل.',
            'بعد انتهاء التسليم ومغادرة عامل التوصيل، لا يمكن الاستبدال.',
          ],
        },
        {
          heading: 'كيف أستبدل؟',
          body: [
            'إذا لم يناسبك المقاس، أعيدي المعطف إلى عامل التوصيل في حالته الأصلية ومع بطاقاته، وراسلينا على واتساب برقم الطلب والمقاس المطلوب. سنرسل لك مقاساً آخر حسب التوفر.',
          ],
        },
        {
          heading: 'الاسترجاع',
          body: ['لا يتم استرجاع ثمن القطع؛ نقترح فقط استبدال المقاس.'],
        },
      ],
    },
  },
  privacy: {
    fr: {
      title: 'Politique de confidentialité',
      sections: [
        {
          heading: 'Données collectées',
          body: [
            'Pour traiter votre commande, nous collectons votre nom, numéro de téléphone, ville, adresse et, si vous le souhaitez, votre e-mail. Nous enregistrons aussi la provenance de votre visite (par exemple une publicité Instagram ou TikTok).',
          ],
        },
        {
          heading: 'Utilisation',
          body: [
            'Ces données servent uniquement à confirmer, livrer et suivre votre commande, et à mesurer l’efficacité de nos publicités. Elles ne sont jamais vendues.',
            'Le site utilise les pixels de Meta et de TikTok pour mesurer les visites et les commandes issues de nos publicités.',
          ],
        },
        {
          heading: 'Vos droits',
          body: [
            'Conformément à la loi 09-08 relative à la protection des personnes physiques à l’égard du traitement des données à caractère personnel, vous disposez d’un droit d’accès, de rectification et d’opposition. Contactez-nous sur WhatsApp ou par e-mail pour l’exercer.',
            'Déclaration CNDP : [numéro à compléter].',
          ],
        },
      ],
    },
    ar: {
      title: 'سياسة الخصوصية',
      sections: [
        {
          heading: 'المعطيات التي نجمعها',
          body: [
            'لمعالجة طلبك نجمع اسمك ورقم هاتفك ومدينتك وعنوانك، وبريدك الإلكتروني إن رغبتِ. كما نسجّل مصدر زيارتك (مثلاً إعلان على إنستغرام أو تيك توك).',
          ],
        },
        {
          heading: 'الاستعمال',
          body: [
            'تُستعمل هذه المعطيات فقط لتأكيد طلبك وتوصيله وتتبّعه، ولقياس فعالية إعلاناتنا. لا نبيعها أبداً.',
            'يستعمل الموقع بكسل ميتا وتيك توك لقياس الزيارات والطلبات القادمة من إعلاناتنا.',
          ],
        },
        {
          heading: 'حقوقك',
          body: [
            'طبقاً للقانون 09-08 المتعلق بحماية الأشخاص الذاتيين تجاه معالجة المعطيات ذات الطابع الشخصي، لك الحق في الولوج والتصحيح والتعرض. تواصلي معنا عبر واتساب أو البريد الإلكتروني.',
            'تصريح اللجنة الوطنية لمراقبة حماية المعطيات (CNDP): [الرقم].',
          ],
        },
      ],
    },
  },
}

export function legalDoc(doc: keyof typeof legal, locale: Locale) {
  return legal[doc][locale]
}
