import { redirect } from 'next/navigation';

export default function ResearchBudgetRedirectPage() {
  redirect('/departments/finance?newBudget=1');
}
