import { Types } from 'mongoose';
import { Company } from '../models/Company.model';
import type { ICompanyDocument } from '../models/Company.model';
import { User } from '../models/User.model';
import type { IUserDocument } from '../models/User.model';
import { Job } from '../models/Job.model';
import { AppError } from '../middleware/error.middleware';
function slugify(name:string):string{return name.toLowerCase().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').trim();}
async function uniqueSlug(base:string):Promise<string>{let s=slugify(base),a=0;while(await Company.exists({slug:a===0?s:`${s}-${a}`}))a++;return a===0?s:`${s}-${a}`;}
function ser(doc:ICompanyDocument){return{_id:doc._id.toString(),name:doc.name,slug:doc.slug,logo:doc.logo??'',coverImage:doc.coverImage??'',tagline:doc.tagline??'',website:doc.website??'',industry:doc.industry??'',size:doc.size,founded:doc.founded,headquarters:doc.headquarters??'',description:doc.description??'',specialties:doc.specialties??[],adminUsers:(doc.adminUsers??[]).map(String),createdAt:doc.createdAt.toISOString(),updatedAt:doc.updatedAt.toISOString()};}
export async function createCompany(adminId:string,input:Record<string,unknown>){
  if(!input.name)throw new AppError('Name required.',400,true);
  const slug=await uniqueSlug(String(input.name));
  const doc=await Company.create({name:input.name,slug,...input,adminUsers:[new Types.ObjectId(adminId)]});
  return ser(doc);
}
export async function getCompany(slug:string){
  const doc=await Company.findOne({slug}).lean<ICompanyDocument>();
  if(!doc)throw new AppError('Company not found.',404,true);
  return ser(doc);
}
export async function updateCompany(slug:string,adminId:string,patch:Record<string,unknown>){
  const doc=await Company.findOne({slug});
  if(!doc)throw new AppError('Company not found.',404,true);
  if(!doc.adminUsers.some(id=>id.toString()===adminId))throw new AppError('Forbidden.',403,true);
  Object.assign(doc,patch);await doc.save();return ser(doc);
}
export async function followCompany(slug:string,userId:string):Promise<void>{
  const c=await Company.findOne({slug}).lean<ICompanyDocument>();if(!c)throw new AppError('Not found.',404,true);
  await User.findByIdAndUpdate(userId,{$addToSet:{following:c._id}});
}
export async function unfollowCompany(slug:string,userId:string):Promise<void>{
  const c=await Company.findOne({slug}).lean<ICompanyDocument>();if(!c)throw new AppError('Not found.',404,true);
  await User.findByIdAndUpdate(userId,{$pull:{following:c._id}});
}
export async function getEmployees(slug:string,page=1,limit=20){
  const c=await Company.findOne({slug}).lean<ICompanyDocument>();if(!c)throw new AppError('Not found.',404,true);
  const filter={'experience.company':{$regex:`^${c.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`,$options:'i'}};
  const[docs,total]=await Promise.all([User.find(filter).select('firstName lastName headline profilePhoto customUrl location').skip((page-1)*limit).limit(limit).lean<IUserDocument[]>(),User.countDocuments(filter)]);
  return{employees:docs.map(u=>({_id:u._id.toString(),fullName:`${u.firstName} ${u.lastName}`,headline:u.headline??'',profilePhoto:u.profilePhoto??'',customUrl:u.customUrl??'',location:u.location??{}})),total,page,totalPages:Math.ceil(total/limit)};
}
export async function getCompanyJobs(slug:string,page=1,limit=10){
  const c=await Company.findOne({slug}).lean<ICompanyDocument>();if(!c)throw new AppError('Not found.',404,true);
  const[docs,total]=await Promise.all([Job.find({companyId:c._id,status:'active'}).sort({postedAt:-1}).skip((page-1)*limit).limit(limit).lean(),Job.countDocuments({companyId:c._id,status:'active'})]);
  return{jobs:docs,total,page,totalPages:Math.ceil(total/limit)};
}

export async function listCompanies(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [companies, total] = await Promise.all([
    Company.find({ isActive: true })
      .select('name slug logo tagline industry')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Company.countDocuments({ isActive: true }),
  ]);
  return { companies, total, page, pages: Math.ceil(total / limit) };
}
