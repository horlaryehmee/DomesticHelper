import test from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { readFileSync } from 'node:fs'
const source=readFileSync(new URL('../src/lib/feature-routes.ts',import.meta.url),'utf8')
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText
const {isPathEnabled,selectFeature}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'))
const paths={jobs:['/jobs','/jobs/*','/admin/jobs'],helpers:['/search','/helpers/*','/helper/profile'],messages:['/helper/messages','/employer/messages']}
test('verification-only navigation hides disabled public and back office destinations',()=>{
 const state={paths,enabled:{jobs:false,helpers:false,messages:false}}
 for(const path of ['/jobs','/jobs/123','/admin/jobs','/jobs?state=Lagos','/search','/helpers/a#reviews','/helper/profile','/employer/messages'])assert.equal(isPathEnabled(path,state),false,path)
 for(const path of ['/','/login','/register','/onboarding','/admin/settings','/admin/verifications','/helper/verification'])assert.equal(isPathEnabled(path,state),true,path)
})
test('enabling one module does not enable other destinations',()=>{
 const state={paths,enabled:{jobs:true,helpers:false,messages:false}}
 assert.equal(isPathEnabled('/jobs/123',state),true)
 assert.equal(isPathEnabled('/admin/jobs',state),true)
 assert.equal(isPathEnabled('/helpers/123',state),false)
 assert.equal(isPathEnabled('/employer/messages',state),false)
})

test('a checkbox changes only its own selection, never its dependencies',()=>{
 const original={job_directory:false,job_posting:false,helper_directory:false}
 const selected=selectFeature(original,'job_posting',true)
 assert.deepEqual(selected,{job_directory:false,job_posting:true,helper_directory:false})
 assert.deepEqual(original,{job_directory:false,job_posting:false,helper_directory:false})
 const deselected=selectFeature({job_directory:true,job_posting:true,helper_directory:true},'job_directory',false)
 assert.deepEqual(deselected,{job_directory:false,job_posting:true,helper_directory:true})
})
