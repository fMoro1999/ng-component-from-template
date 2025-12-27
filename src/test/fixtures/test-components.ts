/**
 * Test fixture: Parent component with various property types
 */
export const PARENT_COMPONENT_SIMPLE = `
import { Component } from '@angular/core';

interface User {
  name: string;
  age: number;
  email: string;
  isActive: boolean;
}

@Component({
  selector: 'app-parent',
  templateUrl: './parent.component.html',
})
export class ParentComponent {
  user: User = {
    name: 'John Doe',
    age: 30,
    email: 'john@example.com',
    isActive: true,
  };

  items: string[] = ['item1', 'item2', 'item3'];
  count: number = 42;
  isEnabled: boolean = true;
  createdAt: Date = new Date();

  handleClick(event: MouseEvent): void {
    console.log('Clicked', event);
  }

  handleSubmit(event: SubmitEvent): void {
    console.log('Submitted', event);
  }

  handleCustom(data: { id: number; name: string }): void {
    console.log('Custom event', data);
  }
}
`;

/**
 * Test fixture: Component with nested properties
 */
export const PARENT_COMPONENT_NESTED = `
import { Component } from '@angular/core';

interface Address {
  street: string;
  city: string;
  zipCode: number;
}

interface Company {
  name: string;
  address: Address;
}

interface Employee {
  id: number;
  name: string;
  company: Company;
}

@Component({
  selector: 'app-nested',
  templateUrl: './nested.component.html',
})
export class NestedComponent {
  employee: Employee = {
    id: 1,
    name: 'Jane Smith',
    company: {
      name: 'ACME Corp',
      address: {
        street: '123 Main St',
        city: 'Springfield',
        zipCode: 12345,
      },
    },
  };

  handleEmployeeClick(employee: Employee): void {
    console.log('Employee clicked', employee);
  }
}
`;

/**
 * Test fixture: Component with arrays and generics
 */
export const PARENT_COMPONENT_GENERICS = `
import { Component } from '@angular/core';
import { Observable } from 'rxjs';

interface Product {
  id: number;
  name: string;
  price: number;
}

@Component({
  selector: 'app-generics',
  templateUrl: './generics.component.html',
})
export class GenericsComponent {
  products: Product[] = [];
  products$: Observable<Product[]>;
  selectedProduct: Product | null = null;

  productMap: Map<number, Product> = new Map();
  productSet: Set<string> = new Set();

  handleProductSelect(product: Product): void {
    console.log('Selected', product);
  }

  handleProductsLoad(products: Product[]): void {
    console.log('Loaded', products);
  }
}
`;

/**
 * Test fixture: Component with signal-based properties (Angular 17+)
 */
export const PARENT_COMPONENT_SIGNALS = `
import { Component, signal, computed } from '@angular/core';

interface UserProfile {
  username: string;
  role: 'admin' | 'user' | 'guest';
}

@Component({
  selector: 'app-signals',
  templateUrl: './signals.component.html',
})
export class SignalsComponent {
  profile = signal<UserProfile>({ username: 'admin', role: 'admin' });
  count = signal<number>(0);
  isLoading = signal<boolean>(false);

  doubleCount = computed(() => this.count() * 2);

  handleProfileUpdate(profile: UserProfile): void {
    this.profile.set(profile);
  }
}
`;

/**
 * Test fixture: Component with union types and complex types
 */
export const PARENT_COMPONENT_COMPLEX = `
import { Component } from '@angular/core';

type Status = 'pending' | 'approved' | 'rejected';
type ID = string | number;

interface Task {
  id: ID;
  title: string;
  status: Status;
  priority: 1 | 2 | 3;
}

@Component({
  selector: 'app-complex',
  templateUrl: './complex.component.html',
})
export class ComplexComponent {
  task: Task = {
    id: '123',
    title: 'Test Task',
    status: 'pending',
    priority: 1,
  };

  statusOptions: Status[] = ['pending', 'approved', 'rejected'];

  optionalValue: string | null = null;
  undefinedValue: number | undefined = undefined;

  handleStatusChange(status: Status): void {
    console.log('Status changed', status);
  }

  handlePriorityChange(priority: 1 | 2 | 3): void {
    console.log('Priority changed', priority);
  }
}
`;
