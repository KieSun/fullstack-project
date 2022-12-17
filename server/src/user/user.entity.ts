import { Entity, Column } from 'typeorm';
import { BaseModelWithUUIDPrimary } from '../common/model';

@Entity()
export class User extends BaseModelWithUUIDPrimary {
  @Column()
  mobile: string;

  @Column()
  password: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  address: string;
}
