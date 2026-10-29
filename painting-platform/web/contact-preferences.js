export const CONTACT_METHODS={phone:'Phone call',email:'Email',either:'Phone call or email'};
export const CONTACT_WINDOWS={no_preference:'No preferred time',weekday_morning:'Weekday mornings, 9 AM–noon Eastern',weekday_afternoon:'Weekday afternoons, noon–5 PM Eastern',weekday_evening:'Weekday evenings, 5–7 PM Eastern'};
const label=(values,key)=>typeof key==='string'&&Object.hasOwn(values,key)?values[key]:'Not provided';
export function contactPreference(project={}){
 const method=label(CONTACT_METHODS,project.contact_method),window=label(CONTACT_WINDOWS,project.contact_window);
 return method==='Not provided'&&window==='Not provided'?'Contact preference: Not provided.':'Preferred contact: '+method+' · '+window+'.';
}
