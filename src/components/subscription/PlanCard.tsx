/**
 * A single subscription plan card. Composition follows the reference (name →
 * price → CTA → derived feature checklist, with Popular/Current badges) while
 * reusing Sphere's existing styling tokens.
 */
import { motion, type Variants } from 'framer-motion';
import { Check } from 'lucide-react';
import { Button } from '../wallet/ui';
import type { PlanInfo } from '../../services/subscriptionApi';
import { planFeatures, formatPlanPrice } from './planFeatures';

interface PlanCardProps {
  plan: PlanInfo;
  current: boolean;
  popular: boolean;
  /** When provided (and the card is not the current plan) the card shows a CTA. */
  onSelect?: (plan: PlanInfo) => void;
  /**
   * Lapsed subscription: the CURRENT plan's store card becomes purchasable
   * again ("Renew" — same key, fresh 30 days). Never applies to the synthetic
   * free-priced current card, which is not a store product.
   */
  renewable?: boolean;
  loading?: boolean;
  disabled?: boolean;
  /** Mount variants (supplied by PlansGrid for the staggered reveal). */
  variants?: Variants;
}

export function PlanCard({ plan, current, popular, onSelect, renewable, loading, disabled, variants }: PlanCardProps) {
  const price = formatPlanPrice(plan);
  const features = planFeatures(plan);
  const renewCta = current && !!renewable && plan.priceCents > 0;
  const showCta = !!onSelect && (!current || renewCta);

  return (
    <motion.div
      variants={variants}
      whileHover={showCta ? { y: -6 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`group relative flex w-full flex-col rounded-2xl border p-6 transition-shadow duration-300 sm:w-58 ${
        current
          ? 'border-emerald-500/30 bg-emerald-500/6'
          : popular
            ? 'border-orange-500/40 bg-orange-500/6 shadow-[0_0_0_1px_rgba(249,115,22,0.15)] hover:shadow-[0_18px_40px_-16px_rgba(249,115,22,0.45)]'
            : 'border-neutral-200 bg-neutral-50 hover:border-orange-500/30 hover:shadow-[0_18px_40px_-20px_rgba(0,0,0,0.5)] dark:border-white/8 dark:bg-white/4'
      }`}
    >
      {/* Badge (Current takes precedence over Popular) */}
      {current ? (
        <span className="absolute right-4 top-4 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-500">
          Current
        </span>
      ) : popular ? (
        <span className="absolute right-4 top-4 rounded-full bg-orange-500 px-2.5 py-0.5 text-[11px] font-medium text-white">
          Popular
        </span>
      ) : null}

      {/* Name */}
      <h3
        className={`text-lg font-semibold capitalize ${
          current ? 'text-emerald-500' : popular ? 'text-orange-500' : 'text-neutral-900 dark:text-white'
        }`}
      >
        {plan.name}
      </h3>

      {/* Price */}
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-3xl font-bold tracking-tight tabular-nums">{price}</span>
        {price !== 'Free' && (
          <span className="text-xs text-neutral-500 dark:text-white/45">/ 30 days</span>
        )}
      </div>

      {/* CTA */}
      <div className="mt-5 min-h-10">
        {showCta ? (
          <Button
            variant={renewCta || popular ? 'primary' : 'secondary'}
            fullWidth
            loading={loading}
            disabled={disabled}
            onClick={() => onSelect?.(plan)}
          >
            {renewCta ? 'Renew plan' : price === 'Free' ? 'Get started' : 'Choose plan'}
          </Button>
        ) : current ? (
          <div className="w-full rounded-xl border border-emerald-500/30 py-2 text-center text-sm font-medium text-emerald-500">
            Your current plan
          </div>
        ) : null}
      </div>

      {/* Derived features */}
      <ul className="mt-6 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2.5 text-sm text-neutral-600 dark:text-white/70">
            <Check className={`h-4 w-4 shrink-0 ${popular && !current ? 'text-orange-500' : 'text-emerald-500'}`} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
