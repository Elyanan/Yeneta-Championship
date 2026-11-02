import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ComponentProps } from 'react';
export const cn=(...v:Parameters<typeof clsx>)=>twMerge(clsx(v));
const variants=cva('button',{variants:{variant:{default:'button-primary',outline:'button-outline',ghost:'button-ghost',destructive:'button-danger'}},defaultVariants:{variant:'default'}});
export function Button({className,variant,asChild=false,...props}:ComponentProps<'button'>&VariantProps<typeof variants>&{asChild?:boolean}){const Comp=asChild?Slot:'button';return <Comp className={cn(variants({variant}),className)} {...props}/>;}
