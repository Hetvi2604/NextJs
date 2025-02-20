'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
 
const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});

// Use Zod to update the expected types
const UpdateInvoice = FormSchema.omit({ id: true, date: true });
 
const CreateInvoice = FormSchema.omit({ id: true, date: true });

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};
 
export async function createInvoice(prevState: State, formData: FormData) {
  // const rawFormData = {
    // const { customerId, amount, status } = CreateInvoice.parse({
       // Validate form fields using Zod
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

    // If form validation fails, return errors early. Otherwise, continue.
    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Missing Fields. Failed to Create Invoice.',
      };
    }
   
  // Test it out:
  // console.log(rawFormData);
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];

//   await sql`
//   INSERT INTO invoices (customer_id, amount, status, date)
//   VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
// `;

try {
  await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
  `;
} catch (error) {
  // We'll log the error to the console for now
  console.error(error);
}

revalidatePath('/dashboard/invoices');
redirect('/dashboard/invoices');
}

export async function updateInvoice(
  id: string,
  prevState: State,
  formData: FormData,
) {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
 
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Invoice.',
    };
  }
 
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
 
  // await sql`
  //   UPDATE invoices
  //   SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
  //   WHERE id = ${id}
  // `;
  try {
    await sql`
        UPDATE invoices
        SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
        WHERE id = ${id}
      `;
  } catch (error) {
    // We'll log the error to the console for now
    console.error(error);
    return { message: 'Database Error: Failed to Update Invoice.' };
  }
 
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

// export async function deleteInvoice(id: string) {
//   throw new Error('Failed to Delete Invoice');
 
//   // Unreachable code block
//   await sql`DELETE FROM invoices WHERE id = ${id}`;
//   revalidatePath('/dashboard/invoices');
// }

// export async function deleteInvoice(id: string) {
//   try {
//     // Attempt to delete the invoice
//     await sql`DELETE FROM invoices WHERE id = ${id}`;

//     // Revalidate the cache for the invoices page
//     revalidatePath('/dashboard/invoices');

//     return { success: true, message: 'Invoice deleted successfully' };
//   } catch (error) {
//     console.error('Error deleting invoice:', error);
//     return { success: false, message: 'Failed to delete invoice' };
//   }
// }

// export async function deleteInvoiceWithId(formData: FormData): Promise<void> {
//   const id = formData.get("id") as string;

//   if (!id) {
//     console.error("Invoice ID is required");
//     return;
//   }

// Define the function to delete an invoice (adjust based on your DB logic)
export async function deleteInvoice(id: string) {
  if (!id) return;

  // Example: Replace this with your actual database deletion logic
  console.log(`Deleting invoice with ID: ${id}`);

  // Example: If using Prisma
  // await prisma.invoice.delete({ where: { id } });

  // Example: If using raw SQL
  // await sql`DELETE FROM invoices WHERE id = ${id}`;
}
export async function deleteInvoiceWithId(formData: FormData) {
  const id = formData.get("invoiceId") as string; // Extract the ID from form input
  if (!id) return;

  await deleteInvoice(id);

  // try {
  //   await sql`DELETE FROM invoices WHERE id = ${id}`;
  //   revalidatePath("/dashboard/invoices");
  // } catch (error) {
  //   console.error("Error deleting invoice:", error);
  // }
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}