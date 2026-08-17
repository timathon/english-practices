export const getTeacherClasses = (tch: any): string[] => {
  if (!tch) return [];
  if (Array.isArray(tch.assignedClasses)) return tch.assignedClasses;
  if (tch.assignedClass && tch.assignedClass !== '未分配') {
    return tch.assignedClass.split(',').map((s: string) => s.trim()).filter(Boolean);
  }
  return [];
};

export const getClassTeachers = (cls: any): string[] => {
  if (!cls) return [];
  if (Array.isArray(cls.teacherNames)) return cls.teacherNames;
  if (cls.teacherName && cls.teacherName !== '未指定教师') {
    return cls.teacherName.split(',').map((s: string) => s.trim()).filter(Boolean);
  }
  return [];
};
